import { BskyAgent, AtpSessionEvent, AtpSessionData, RichText } from '@atproto/api';
import cron from 'node-cron';
import boxen from 'boxen';
import { config } from 'dotenv';
import colors from 'colors';
import { heartIcon, shareIcon, replyIcon, wait } from './utils';
import { agent, login } from './auth';
import { db } from './db';
import { Notification } from '@atproto/api/dist/client/types/app/bsky/notification/listNotifications';
import { makeANiceThing } from './niceThingsToSay';
// import getTopUsers from './topUsers';
let savedSessionData: AtpSessionData;
config();


async function getTimeline() {
  console.log(`Getting timeline...`);
  const timeline = await agent.getTimeline({
    limit: 25
  });
  if (!timeline.data?.feed) {
    console.log('No timeline data');
    return;
  }

  timeline.data.feed.forEach(function ({ post, reply }) {
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
  const rt = new RichText({ text: 'Hello from the Bluesky API. Code written by @wesbos.com' })
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

const dids = {
  wesboscom: 'did:plc:etdjdgnly5tz5l5xdd4jq76d',
  wesbsky: 'did:plc:aazhmzwhlizrj353fza2w6f2'
}


async function reply(notification: Notification) {
  console.log(`🔥 Replying to @${notification.author.handle} because they ${notification.reason}`);
  const text = makeANiceThing(notification.reason);
  const rt = new RichText({ text })
  await rt.detectFacets(agent);
  const post = {
    $type: 'app.bsky.feed.post',
    createdAt: new Date().toISOString(),
    text: rt.text,
    facets: rt.facets,
    reply: {
      root: {
        cid: notification.cid,
        uri: notification.uri
      },
      parent: {
        cid: notification.cid,
        uri: notification.uri
      },
    }
  };
  // return;
  const res = await agent.app.bsky.feed.post.create({
    repo: agent.session?.did,
  }, post);
  return res;
}

async function checkForNewMentions() {
  console.log('Running', new Date().toLocaleString());
  const response = await agent.listNotifications();
  const replies = response.data.notifications
    // Filter for only replies
    .filter((notification) => notification.reason === 'mention')
    // Filter for replies that don't include my other handle @wesbos.com
    .filter((notification) => {
      const mentionsWes = notification.record.facets?.find(facet => facet.features.at(0).did === dids.wesboscom);
      return !mentionsWes;
    });

  const follows = response.data.notifications.filter((notification) => notification.reason === 'follow');

  for (const notification of [...follows, ...replies]) {
    const { cid, reason, record, authot } = notification;
    const key = `${reason}-${cid}`;
    const existing = await db.get(key);
    if (existing) {
      // console.log(`👋 Already notified: ${reason} from ${notification.author.handle}`);
      continue;
    }
    // Reply to them
    await reply(notification);
    // Save them as replies to
    db.put(key, true);
    // Wait 100ms
    await wait(100);
  };
  // Loop over each notification and deal with the  reason: 'mention' and 'follow'
}

async function go() {
  await login();
  cron.schedule('*/15 * * * * *', async () => {
    await checkForNewMentions();
  });
  //  await getTimeline();
  // await post();
}

go();
export { }
