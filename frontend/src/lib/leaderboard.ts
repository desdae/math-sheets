export const findCurrentUserRank = (
  rows: Array<{ public_nickname: string }>,
  publicNickname: string | null | undefined
) => {
  if (!publicNickname) {
    return 0;
  }

  return rows.findIndex((row) => row.public_nickname === publicNickname) + 1;
};
