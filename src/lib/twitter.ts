const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN ?? "";

interface TweetMetrics {
  likes: number;
  retweets: number;
  replies: number;
  views: number;
}

export function calculateEngagementScore(metrics: TweetMetrics): number {
  return (
    metrics.likes * 1 +
    metrics.retweets * 3 +
    metrics.replies * 2 +
    metrics.views * 0.01
  );
}

export async function fetchTweetMetrics(
  tweetId: string
): Promise<TweetMetrics | null> {
  if (!X_BEARER_TOKEN) return null;

  const res = await fetch(
    `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics`,
    {
      headers: { Authorization: `Bearer ${X_BEARER_TOKEN}` },
    }
  );

  if (!res.ok) return null;

  const data = await res.json();
  const m = data.data?.public_metrics;
  if (!m) return null;

  return {
    likes: m.like_count ?? 0,
    retweets: m.retweet_count ?? 0,
    replies: m.reply_count ?? 0,
    views: m.impression_count ?? 0,
  };
}

export function extractTweetId(url: string): string | null {
  const match = url.match(/status\/(\d+)/);
  return match ? match[1] : null;
}
