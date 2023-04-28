import { BskyAgent } from '@atproto/api';
import { login, agent } from '.';
import { ProfileView } from '@atproto/api/dist/client/types/app/bsky/actor/defs';
import { readFile, writeFile } from 'fs/promises';
import wait from 'waait';
import colors from 'colors';

const people = new Map<string, ProfileView>();

export default async function getAndSaveFollowersFor(did: string) {

  const profile = people.get(did);
  console.log(colors.green(`Getting followers for @${profile?.handle}...`));
  // Start with a user and get their followers
  const response = await agent.getFollowers({
    limit: 100,
    // Default to yourself
    actor: did
  });
  console.log(`adding ${response.data.followers.length} followers`);
  response.data.followers.forEach(follower => {
    if(!people.has(follower.did)) {
      people.set(follower.did, follower);
    }
  });

  // Mark this Did as having been processed
  const person = people.get(did);
  if(person) {
    console.log(`Marking ${colors.green(person.handle)} as processed`);
    person.processed = true;
    people.set(did, person);
  } else {
    console.log(`No person found for ${did}`);
  }
  await Promise.all([saveLocally(), wait(500)])
  // run it again on a random person
  const nextPerson = Array.from(people.values()).find(p => !p.processed);
  if(nextPerson) {
    await getAndSaveFollowersFor(nextPerson.did);
  }
}

async function saveLocally() {
  const json = JSON.stringify(Array.from(people.entries()), null, 2);
  writeFile('./people.json', json, { encoding: 'utf-8' });
  console.log(`Saved ${people.size} people to disk`);
}

async function restoreFromLocal() {
  const json = await readFile('./people.json', { encoding: 'utf-8' });
  const entries = JSON.parse(json) as [string, ProfileView][];
  entries.forEach(([did, profile]) => people.set(did, profile));
  console.log(`📁 Restored ${people.size} people from disk`);
}

async function hydrateFollowerCount() {
  const toHydrate = Array.from(people.values())
    .filter(p => p.followersCount === undefined)
    .map(p => p.did)
  console.log(`Found ${toHydrate.length} people to hydrate`);
  const dids = toHydrate.slice(0, 25);
  console.log(`Hydrating ${dids.length} people`);
  const response = await agent.getProfiles({
    actors: dids
  });
  // Save respones to people
  response.data.profiles.forEach(profile => {
    const person = people.get(profile.did);
    if(person) {
      person.followersCount = profile.followersCount;
      person.followsCount = profile.followsCount;
      person.postsCount = profile.postsCount;
      people.set(profile.did, person);
    }
  });
  await saveLocally();
  await wait(500);
  hydrateFollowerCount();
}


function sortBy(property: string, arrayToSort: ProfileView[]) {
  return arrayToSort.sort((a, b) => {
    return b[property] - a[property];
  });
}

function slimDown(profile: ProfileView) {
  const properties = [[`displayName`, 'name'], ['handle', 'handle'], ['followersCount', 'followers'], ['followsCount', 'following'], ['postsCount', 'posts']];
  const slim = {} as ProfileView;
  properties.forEach(([prop, label]) => {
    slim[label] = typeof profile[prop] === 'number' ? profile[prop].toLocaleString() : profile[prop];
  });
  slim['Following Ratio'] = (profile.followsCount / profile.followersCount).toFixed(2);
  return slim;
}

async function getTop() {
  console.log('Getting top users...');
  const peopleArray = Array.from(people.values());
  const topByFollowers = sortBy('followersCount', peopleArray).slice(0, 25).map(slimDown);
  const topFiltered = sortBy('followersCount', peopleArray)
    .map(slimDown)
    // Filter out people who follow everyone
    .filter(p => p['Following Ratio'] < 1.5 )
    // filter out people on bsky team
    .filter(p => !p.handle.includes('bsky.team'))
    .slice(0, 25);
  const topByPosts = sortBy('followersCount', peopleArray).slice(0, 10).map(slimDown);
  const mostPosts = sortBy('postsCount', peopleArray).slice(0, 10).map(slimDown);
  console.table(mostPosts);
  // console.table(topFiltered);
  // console.log(topFiltered.map(x=> `@${x.handle}`).join(' '));
}

async function go() {
  console.log('Starting...');
  await login();
  await restoreFromLocal();
  // const nextPerson = Array.from(people.values()).find(p => !p.processed);
  // await getAndSaveFollowersFor(nextPerson?.did);
  // await hydrateFollowerCount();
  await getTop();
}

go();
