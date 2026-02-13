export const calculateBMI = (weight: number, height: number): number => {
  if (!weight || !height || height === 0) return 0;
  // Height in meters
  const heightInMeters = height / 100;
  return Number((weight / (heightInMeters * heightInMeters)).toFixed(1));
};

export const getBMICategory = (bmi: number): string => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
};

export const getTodayDate = (): string => {
  return formatDate(new Date());
};

export const getWeekDates = (): string[] => {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(formatDate(date));
  }
  return dates;
};

