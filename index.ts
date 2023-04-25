import { BskyAgent, AtpSessionEvent, AtpSessionData, RichText } from '@atproto/api';
import { writeFile, readFile } from 'node:fs/promises';
import boxen from 'boxen';
import { config } from 'dotenv';
import colors from 'colors';
import { heartIcon, shareIcon, replyIcon } from './utils';
let savedSessionData: AtpSessionData;
config();

const agent = new BskyAgent({
  service: 'https://bsky.social',
  persistSession: (evt: AtpSessionEvent, sesh?: AtpSessionData) => {
    if(!sesh) {
      throw new Error('No session data to persist. Did ya pass an incorrect username/password?');
    }
    // store the session-data for reuse
    savedSessionData = sesh;
    // ! Uncomment this line to save the session data to disk. Beware that this is a sensitive file!
    // writeFile('./session.json', JSON.stringify(sesh));
  }
})

async function login() {
  console.log('Logging in...');
  // See if we have saved session data
  const sesh = await readFile('./session.json', { encoding: 'utf-8' });
  if(sesh) {
    console.log('Found saved session data. Resuming session...');
    savedSessionData = JSON.parse(sesh);
    await agent.resumeSession(savedSessionData)
  }
  else {
    console.log('No saved session data. Logging in...');
    await agent.login({
      identifier: process.env.ATPROTO_USERNAME as string,
      password: process.env.ATPROTO_PASS as string
    })
  }
}

async function getTimeline() {
  console.log(`Getting timeline...`);
  const timeline = await agent.getTimeline({
    limit: 10
  });
  if(!timeline.data?.feed) {
    console.log('No timeline data');
    return;
  }

  timeline.data.feed.forEach(function( { post, reply }) {
    const replyTo = reply ? colors.dim(`↩ @${reply?.parent.author.handle}`) : '';
    const stats = `${replyIcon} ${post.replyCount} ${shareIcon} ${post.repostCount} ${heartIcon} ${post.likeCount}`;
    const handle = colors.bgYellow(`@${post.author.handle}`);
    const content = colors.white(post.record.text);
    const sky = `${content}

${stats}
`;
    const box = boxen(sky, {
      title: `${handle} ${replyTo}`,
      titleAlignment: 'center',
      padding: 1,
      borderStyle: 'double',
    });
    console.log(box);
  });
}

async function post() {
  const rt = new RichText({ text: 'Hello from the Bluesky API. Code written by @wesbos.bsky.social' })
  await rt.detectFacets(agent) // automatically detects mentions and links
  const postRecord = {
    $type: 'app.bsky.feed.post',
    text: rt.text,
    facets: rt.facets,
    createdAt: new Date().toISOString()
  }



  const res = await agent.app.bsky.feed.post.create({
    repo: agent.session?.did,
  }, postRecord);
  console.log(res);
}

async function go() {
 await login();
 await getTimeline();
  // await post();
}


go();
export {}
