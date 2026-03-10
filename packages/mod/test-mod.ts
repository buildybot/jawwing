import { reviewPost } from './engine';

async function main() {
  const testPost = {
    id: 'test-001',
    content: 'Just saw the best sunset from the Lincoln Memorial',
    lat: 38.9072,
    lng: -77.0369,
  };

  const result = await reviewPost(testPost as any);
  console.log('Result:', JSON.stringify(result, null, 2));
}

main().catch(console.error);
