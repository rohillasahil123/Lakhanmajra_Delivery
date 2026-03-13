type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  richContent?: {
    image?: string;
  };
};

type ExpoPushResult = {
  sentCount: number;
  failedCount: number;
  invalidTokens: string[];
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const isExpoToken = (value: string): boolean => {
  return /^ExponentPushToken\[[^\]]+\]$/.test(value) || /^ExpoPushToken\[[^\]]+\]$/.test(value);
};

const chunk = <T>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
};

type BatchCounts = { sentCount: number; failedCount: number };

const countBatchResults = (
  tokenBatch: string[],
  results: Array<{ status?: string; details?: { error?: string } }>,
  invalidTokens: Set<string>
): BatchCounts => {
  let sentCount = 0;
  let failedCount = 0;

  for (let i = 0; i < tokenBatch.length; i += 1) {
    const token = tokenBatch[i];
    const row = results[i];

    if (row?.status === 'ok') {
      sentCount += 1;
      continue;
    }

    failedCount += 1;
    if (row?.details?.error === 'DeviceNotRegistered') {
      invalidTokens.add(token);
    }
  }

  return { sentCount, failedCount };
};

export const sendExpoPushNotifications = async (
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>,
  imageUrl?: string
): Promise<ExpoPushResult> => {
  const uniqueTokens = Array.from(new Set((tokens || []).map((t) => String(t || '').trim()).filter(isExpoToken)));

  if (!uniqueTokens.length) {
    return { sentCount: 0, failedCount: 0, invalidTokens: [] };
  }

  const batches = chunk(uniqueTokens, 100);
  let sentCount = 0;
  let failedCount = 0;
  const invalidTokens = new Set<string>();

  for (const tokenBatch of batches) {
    const trimmedImageUrl = String(imageUrl || '').trim();
    const messages: ExpoPushMessage[] = tokenBatch.map((token) => ({
      to: token,
      title,
      body,
      data,
      ...(trimmedImageUrl ? { richContent: { image: trimmedImageUrl } } : {}),
    }));

    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      if (!response.ok) {
        failedCount += tokenBatch.length;
        continue;
      }

      const payload = (await response.json()) as {
        data?: Array<{ status?: string; details?: { error?: string } }>;
      };
      const results = Array.isArray(payload?.data) ? payload.data : [];
      const counts = countBatchResults(tokenBatch, results, invalidTokens);
      sentCount += counts.sentCount;
      failedCount += counts.failedCount;
    } catch {
      failedCount += tokenBatch.length;
    }
  }

  return {
    sentCount,
    failedCount,
    invalidTokens: Array.from(invalidTokens),
  };
};
