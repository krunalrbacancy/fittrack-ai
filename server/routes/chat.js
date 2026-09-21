import express from 'express';
import multer from 'multer';
import { Type } from '@google/genai';
import { protect } from '../middleware/auth.js';
import ChatMessage from '../models/ChatMessage.js';
import ChatUsage from '../models/ChatUsage.js';
import User from '../models/User.js';
import WeightLog from '../models/WeightLog.js';
import WaistLog from '../models/WaistLog.js';
import FoodEntry from '../models/FoodEntry.js';
import WorkoutLog from '../models/WorkoutLog.js';
import StepsLog from '../models/StepsLog.js';
import WaterLog from '../models/WaterLog.js';
import { getAI, embedText, cosineSimilarity } from '../utils/embeddings.js';

const router = express.Router();

router.use(protect);

const MODEL_FALLBACK_CHAIN = process.env.GEMINI_MODEL
  ? [process.env.GEMINI_MODEL]
  : ['gemini-flash-lite-latest', 'gemini-flash-latest', 'gemma-4-26b-a4b-it'];
const DAILY_TOKEN_BUDGET = 100000;

const isQuotaError = (error) =>
  error?.status === 429 || /RESOURCE_EXHAUSTED|429/.test(error?.message || '');

const RECENT_HISTORY_MESSAGES = 10;
const RETRIEVED_HISTORY_MESSAGES = 6;
const MIN_MESSAGES_FOR_RETRIEVAL = 30;

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are supported'));
    }
    cb(null, true);
  }
});

const CONTEXT_DAYS = 7;

// RAG retrieval: given the new message's embedding, find the most semantically
// similar older messages (outside the recent window) instead of only relying on recency.
const retrieveRelevantHistory = async (userId, queryEmbedding, excludeIds) => {
  if (!queryEmbedding) return [];

  const candidates = await ChatMessage.find({
    userId,
    _id: { $nin: excludeIds },
    embedding: { $exists: true }
  })
    .select('+embedding')
    .sort({ createdAt: -1 })
    .limit(200);

  if (candidates.length === 0) return [];

  const scored = candidates
    .map((msg) => ({ msg, score: cosineSimilarity(queryEmbedding, msg.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, RETRIEVED_HISTORY_MESSAGES)
    .filter((s) => s.score > 0.55); // drop weak matches rather than padding with noise

  return scored.map((s) => s.msg).sort((a, b) => a.createdAt - b.createdAt);
};

const fmtDate = (date) => new Date(date).toISOString().split('T')[0];

const buildUserContext = async (user) => {
  const since = new Date();
  since.setDate(since.getDate() - CONTEXT_DAYS);

  const [weightLogs, waistLogs, foodEntries, workoutLogs, stepsLogs, waterLogs] = await Promise.all([
    WeightLog.find({ userId: user._id, date: { $gte: since } }).sort({ date: 1 }),
    WaistLog.find({ userId: user._id, date: { $gte: since } }).sort({ date: 1 }),
    FoodEntry.find({ userId: user._id, date: { $gte: since } }).sort({ date: 1 }),
    WorkoutLog.find({ userId: user._id, date: { $gte: since } }).sort({ date: 1 }),
    StepsLog.find({ userId: user._id, date: { $gte: since } }).sort({ date: 1 }),
    WaterLog.find({ userId: user._id, date: { $gte: since } }).sort({ date: 1 })
  ]);

  const lines = [];

  lines.push(`Name: ${user.name || user.username}`);
  if (user.age) lines.push(`Age: ${user.age}`);
  if (user.height) lines.push(`Height: ${user.height} cm`);
  if (user.currentWeight) lines.push(`Current weight: ${user.currentWeight} kg`);
  if (user.targetWeight) lines.push(`Target weight: ${user.targetWeight} kg`);
  if (user.targetWaist) lines.push(`Target waist: ${user.targetWaist} cm`);
  lines.push(`Goal: ${user.goal}`);
  lines.push(`Daily targets: ${user.dailyCalorieTarget} kcal, ${user.dailyProteinTarget}g protein`);

  if (weightLogs.length) {
    lines.push(`\nWeight log (last ${CONTEXT_DAYS} days):`);
    weightLogs.forEach((log) => lines.push(`- ${fmtDate(log.date)}: ${log.weight} kg`));
  }

  if (waistLogs.length) {
    lines.push(`\nWaist log (last ${CONTEXT_DAYS} days):`);
    waistLogs.forEach((log) => lines.push(`- ${fmtDate(log.date)}: ${log.waist} cm`));
  }

  if (foodEntries.length) {
    const byDate = {};
    foodEntries.forEach((entry) => {
      const key = fmtDate(entry.date);
      if (!byDate[key]) byDate[key] = { calories: 0, protein: 0, count: 0 };
      byDate[key].calories += entry.calories * entry.quantity;
      byDate[key].protein += entry.protein * entry.quantity;
      byDate[key].count += 1;
    });
    lines.push(`\nDaily nutrition totals (last ${CONTEXT_DAYS} days):`);
    Object.entries(byDate).forEach(([date, totals]) => {
      lines.push(`- ${date}: ${Math.round(totals.calories)} kcal, ${Math.round(totals.protein)}g protein (${totals.count} entries)`);
    });
  }

  if (stepsLogs.length) {
    lines.push(`\nSteps log (last ${CONTEXT_DAYS} days):`);
    stepsLogs.forEach((log) => lines.push(`- ${fmtDate(log.date)}: ${log.steps} steps`));
  }

  if (workoutLogs.length) {
    lines.push(`\nWorkout log (last ${CONTEXT_DAYS} days):`);
    workoutLogs.forEach((log) =>
      lines.push(`- ${fmtDate(log.date)}: ${log.workoutType || 'workout'} (${log.duration || 0} min)`)
    );
  }

  if (waterLogs.length) {
    const byDate = {};
    waterLogs.forEach((log) => {
      const key = fmtDate(log.date);
      byDate[key] = (byDate[key] || 0) + log.amount;
    });
    lines.push(`\nDaily water intake (last ${CONTEXT_DAYS} days):`);
    Object.entries(byDate).forEach(([date, amount]) => lines.push(`- ${date}: ${amount} ml`));
  }

  return lines.join('\n');
};

const LOG_FOOD_FUNCTION = 'log_food_entry';

const logFoodDeclaration = {
  name: LOG_FOOD_FUNCTION,
  description:
    "Log a food or meal entry to the user's food diary. Call this whenever the user describes something they ate or drank and wants it recorded (e.g. \"I had 2 eggs and toast for breakfast\", \"log a coffee\"). Estimate nutrition values using your general knowledge; the user can edit them later in the app.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      foodName: { type: Type.STRING, description: 'Short name of the food or meal, e.g. "2 boiled eggs and toast"' },
      quantity: { type: Type.NUMBER, description: 'Number of servings this entry represents. Default 1.' },
      calories: { type: Type.NUMBER, description: 'Estimated total calories for one serving' },
      protein: { type: Type.NUMBER, description: 'Estimated grams of protein for one serving' },
      carbs: { type: Type.NUMBER, description: 'Estimated grams of carbs for one serving' },
      fats: { type: Type.NUMBER, description: 'Estimated grams of fat for one serving' },
      fiber: { type: Type.NUMBER, description: 'Estimated grams of fiber for one serving' },
      sugar: { type: Type.NUMBER, description: 'Estimated grams of sugar for one serving' },
      category: {
        type: Type.STRING,
        enum: ['breakfast', 'lunch', 'snacks', 'dinner'],
        description: 'Meal category. Infer from context (time of day, wording); default to lunch if unclear.'
      }
    },
    required: ['foodName', 'calories', 'protein', 'category']
  }
};

const executeLogFoodEntry = async (userId, args) => {
  if (!args.foodName || args.calories === undefined || args.protein === undefined) {
    return { success: false, error: 'Missing required fields (foodName, calories, protein)' };
  }

  const entry = await FoodEntry.create({
    userId,
    foodName: String(args.foodName).slice(0, 200),
    calories: Math.max(0, Number(args.calories) || 0),
    protein: Math.max(0, Number(args.protein) || 0),
    carbs: Math.max(0, Number(args.carbs) || 0),
    fats: Math.max(0, Number(args.fats) || 0),
    fiber: Math.max(0, Number(args.fiber) || 0),
    sugar: Math.max(0, Number(args.sugar) || 0),
    quantity: Math.max(0.1, Number(args.quantity) || 1),
    category: ['breakfast', 'lunch', 'snacks', 'dinner'].includes(args.category) ? args.category : 'lunch',
    date: new Date()
  });

  return {
    success: true,
    logged: {
      foodName: entry.foodName,
      quantity: entry.quantity,
      calories: entry.calories,
      protein: entry.protein,
      category: entry.category
    }
  };
};

const buildSystemPrompt = (context) => `You are the in-app AI coach for FitTrack AI, a fitness and diet tracking app. You help the user understand their own logged data, give practical diet/fitness advice, and can log food entries for them.

Rules:
- Base answers on the user's actual data below when relevant. Don't invent numbers that aren't there.
- Keep answers concise and conversational, suitable for a chat widget (a few short paragraphs or a short list at most).
- When the user describes something they ate or drank, or sends a photo of a meal, call ${LOG_FOOD_FUNCTION} to log it with your best nutrition estimate, then briefly confirm what was logged and the estimated calories/protein. Mention the values are estimates they can edit in the Foods tab.
- When shown a photo, identify the food(s) visible and estimate portion sizes as best you can from the image before calling ${LOG_FOOD_FUNCTION}. If the image doesn't show food, say so instead of guessing.
- Only call ${LOG_FOOD_FUNCTION} when the user is describing or showing something they actually consumed, not when asking hypothetical questions (e.g. "how many calories are in a banana?" should NOT be logged).
- You are not a doctor; for medical concerns, suggest consulting a professional.
- If the data needed to answer isn't available, say so instead of guessing.

User's current profile and recent activity (last ${CONTEXT_DAYS} days):
${context}`;

const getTodayUsage = async (userId) => {
  const today = fmtDate(new Date());
  const usage = await ChatUsage.findOne({ userId, date: today });
  return { date: today, tokensUsed: usage?.totalTokens || 0 };
};

const addTodayUsage = async (userId, tokens) => {
  const today = fmtDate(new Date());
  const usage = await ChatUsage.findOneAndUpdate(
    { userId, date: today },
    { $inc: { totalTokens: tokens } },
    { upsert: true, new: true }
  );
  return usage.totalTokens;
};

// @route   GET /api/chat/history
// @desc    Get recent chat history for the logged-in user
// @access  Private
router.get('/history', async (req, res) => {
  try {
    const messages = await ChatMessage.find({ userId: req.user._id })
      .sort({ createdAt: 1 })
      .limit(100);
    res.json(messages);
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/chat/usage
// @desc    Get today's token usage and remaining daily budget
// @access  Private
router.get('/usage', async (req, res) => {
  try {
    const { tokensUsed } = await getTodayUsage(req.user._id);
    res.json({
      tokensUsed,
      dailyBudget: DAILY_TOKEN_BUDGET,
      tokensRemaining: Math.max(0, DAILY_TOKEN_BUDGET - tokensUsed)
    });
  } catch (error) {
    console.error('Get chat usage error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/chat
// @desc    Send a message to the AI coach and get a reply
// @access  Private
const uploadImage = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ message: err.message || 'Invalid image upload' });
    next();
  });
};

router.post('/', uploadImage, async (req, res) => {
  try {
    const aiClient = getAI();
    if (!aiClient) {
      return res.status(503).json({ message: 'AI chat is not configured on the server' });
    }

    const message = (req.body.message || '').trim();
    const imageFile = req.file;

    if (!message && !imageFile) {
      return res.status(400).json({ message: 'Message or image is required' });
    }

    const { tokensUsed: usedBeforeThisRequest } = await getTodayUsage(req.user._id);
    if (usedBeforeThisRequest >= DAILY_TOKEN_BUDGET) {
      return res.status(429).json({
        message: "You've used your daily AI chat budget. It resets at midnight.",
        tokensUsed: usedBeforeThisRequest,
        dailyBudget: DAILY_TOKEN_BUDGET,
        tokensRemaining: 0
      });
    }

    // Text stored/embedded for history purposes — a caption for image-only messages
    const storedMessageText = message || '[Photo of a meal]';
    const imageDataUrl = imageFile
      ? `data:${imageFile.mimetype};base64,${imageFile.buffer.toString('base64')}`
      : undefined;

    const user = await User.findById(req.user._id);
    const [context, recentHistory, totalMessageCount, queryEmbedding] = await Promise.all([
      buildUserContext(user),
      ChatMessage.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(RECENT_HISTORY_MESSAGES),
      ChatMessage.countDocuments({ userId: req.user._id }),
      embedText(aiClient, storedMessageText)
    ]);

    // RAG: once there's enough history that recency alone would miss things,
    // also retrieve older messages that are semantically similar to this one.
    let retrievedHistory = [];
    if (totalMessageCount >= MIN_MESSAGES_FOR_RETRIEVAL) {
      const recentIds = recentHistory.map((m) => m._id);
      retrievedHistory = await retrieveRelevantHistory(req.user._id, queryEmbedding, recentIds);
    }

    const orderedHistory = [...retrievedHistory, ...recentHistory.slice().reverse()];
    const history = orderedHistory.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    let loggedFoodEntry = null;
    let promptTokens = 0;
    let completionTokens = 0;
    let replyText = '';
    let usedModel = null;
    let lastError = null;

    for (const model of MODEL_FALLBACK_CHAIN) {
      try {
        const chatSession = aiClient.chats.create({
          model,
          history,
          config: {
            systemInstruction: buildSystemPrompt(context),
            tools: [{ functionDeclarations: [logFoodDeclaration] }]
          }
        });

        const messageParts = [];
        if (message) messageParts.push({ text: message });
        if (imageFile) {
          messageParts.push({
            inlineData: { mimeType: imageFile.mimetype, data: imageFile.buffer.toString('base64') }
          });
        }

        let response = await chatSession.sendMessage({ message: messageParts });
        let modelPromptTokens = response.usageMetadata?.promptTokenCount || 0;
        let modelCompletionTokens = response.usageMetadata?.candidatesTokenCount || 0;
        let modelLoggedFoodEntry = null;

        // Handle up to one round of function calls (the model may call log_food_entry, then reply in text)
        const functionCalls = response.functionCalls;
        if (functionCalls && functionCalls.length > 0) {
          const functionResponseParts = [];

          for (const call of functionCalls) {
            if (call.name === LOG_FOOD_FUNCTION) {
              const result = await executeLogFoodEntry(req.user._id, call.args || {});
              if (result.success) modelLoggedFoodEntry = result.logged;
              functionResponseParts.push({
                functionResponse: { name: call.name, id: call.id, response: { output: result } }
              });
            } else {
              functionResponseParts.push({
                functionResponse: { name: call.name, id: call.id, response: { output: { success: false, error: 'Unknown function' } } }
              });
            }
          }

          response = await chatSession.sendMessage({ message: functionResponseParts });
          modelPromptTokens += response.usageMetadata?.promptTokenCount || 0;
          modelCompletionTokens += response.usageMetadata?.candidatesTokenCount || 0;
        }

        promptTokens = modelPromptTokens;
        completionTokens = modelCompletionTokens;
        loggedFoodEntry = modelLoggedFoodEntry;
        replyText = response.text || "Sorry, I couldn't come up with a response. Please try again.";
        usedModel = model;
        break;
      } catch (error) {
        lastError = error;
        if (isQuotaError(error)) {
          console.warn(`Gemini model ${model} hit its quota, falling back to next model`);
          continue;
        }
        throw error;
      }
    }

    if (!usedModel) {
      throw lastError || new Error('All configured Gemini models are unavailable');
    }

    const totalTokens = promptTokens + completionTokens;

    const replyEmbedding = await embedText(aiClient, replyText);

    const [totalTokensUsedToday] = await Promise.all([
      addTodayUsage(req.user._id, totalTokens),
      ChatMessage.create([
        { userId: req.user._id, role: 'user', content: storedMessageText, embedding: queryEmbedding || undefined, imageDataUrl },
        { userId: req.user._id, role: 'assistant', content: replyText, embedding: replyEmbedding || undefined }
      ])
    ]);

    res.json({
      reply: replyText,
      loggedFoodEntry,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
        dailyBudget: DAILY_TOKEN_BUDGET,
        tokensRemaining: Math.max(0, DAILY_TOKEN_BUDGET - totalTokensUsedToday)
      }
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ message: 'Failed to get a response from the AI coach' });
  }
});

// @route   DELETE /api/chat/history
// @desc    Clear chat history for the logged-in user
// @access  Private
router.delete('/history', async (req, res) => {
  try {
    await ChatMessage.deleteMany({ userId: req.user._id });
    res.json({ message: 'Chat history cleared' });
  } catch (error) {
    console.error('Clear chat history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
