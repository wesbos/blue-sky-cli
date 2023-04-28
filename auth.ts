import { BskyAgent, AtpSessionEvent, AtpSessionData } from '@atproto/api';

let savedSessionData: AtpSessionData;
import { config } from 'dotenv';
import { readFile, writeFile } from 'node:fs/promises';
config();

export const agent = new BskyAgent({
  service: 'https://bsky.social',
  persistSession: (evt: AtpSessionEvent, sesh?: AtpSessionData) => {
    if (!sesh) {
      throw new Error('No session data to persist. Did ya pass an incorrect username/password?');
    }
    // store the session-data for reuse
    savedSessionData = sesh;
    // ! Uncomment this line to save the session data to disk. Beware that this is a sensitive file!
    writeFile('./session.json', JSON.stringify(sesh));
  }
})

export async function login() {
  // If already logged in, resume session
  if (agent.session) {
    console.log('Already logged in...');
  }
  console.log('Logging in...');
  // See if we have saved session data
  const sesh = await readFile('./session.json', { encoding: 'utf-8' }).catch(() => null);
  if (sesh) {
    console.log('Found saved session data. Resuming session...');
    savedSessionData = JSON.parse(sesh);
    await agent.resumeSession(savedSessionData)
  }
  else {
    console.log('No saved session data. Logging in...');
    await agent.login({
      identifier: process.env.BSKY_USERNAME as string,
      password: process.env.BSKY_PASS as string
    })
  }
  return agent;
}
