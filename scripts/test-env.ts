import dotenv from 'dotenv';
import path from 'path';

// .env.local を読み込む
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

console.log('Environment Variables Check:');
console.log('KINTONE_DOMAIN:', process.env.KINTONE_DOMAIN ? '✅ SET' : '❌ NOT SET');
console.log('KINTONE_API_TOKEN_SCHEDULE:', process.env.KINTONE_API_TOKEN_SCHEDULE ? '✅ SET' : '❌ NOT SET');
console.log('KINTONE_API_TOKEN_JM:', process.env.KINTONE_API_TOKEN_JM ? '✅ SET' : '❌ NOT SET');
console.log('KINTONE_API_TOKEN_RULEBOOK:', process.env.KINTONE_API_TOKEN_RULEBOOK ? '✅ SET' : '❌ NOT SET');
console.log('\nAll env keys:', Object.keys(process.env).filter(k => k.startsWith('KINTONE')));
