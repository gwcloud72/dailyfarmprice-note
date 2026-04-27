export const formatWon = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return `${Number(value).toLocaleString('ko-KR')}원`;
};

export const formatSignedWon = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  const sign = Number(value) > 0 ? '+' : '';
  return `${sign}${Number(value).toLocaleString('ko-KR')}원`;
};

export const formatDate = (dateText) => {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return dateText;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}`;
};

export const formatFullDate = (dateText) => {
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) return dateText;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
};

export const formatPercent = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  const sign = Number(value) > 0 ? '+' : '';
  return `${sign}${Number(value).toFixed(1)}%`;
};
