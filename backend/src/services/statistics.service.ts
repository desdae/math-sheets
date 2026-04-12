import { getUserHistoryByUserId, getUserStatisticsByUserId } from "../repositories/worksheet.repository.js";

export const getUserStatistics = async (userId: string) => {
  return getUserStatisticsByUserId(userId);
};

export const getUserHistory = async (userId: string) => {
  return getUserHistoryByUserId(userId);
};
