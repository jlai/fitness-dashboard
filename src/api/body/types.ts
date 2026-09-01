export interface WeightLog {
  /** Resource name used to delete the weight datapoint. */
  name: string;
  /** Civil date `YYYY-MM-DD`. */
  date: string;
  /** Local time `HH:mm:ss`. */
  time: string;
  /** Weight in kilograms. */
  weight: number;
  /** Body fat percentage in range [0, 100], if logged. */
  fat?: number;
  /** BMI derived from the latest height on or before this log. */
  bmi?: number;
}
