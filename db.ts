import {KVS} from 'sqlite-kvs';
const db = new KVS();
db.open('./bluesky.db');
export { db }
