const emojis = [ '👋', '👍', '👌', '🙌', '🤙', '👏', '🤝', '👊', '🤟', '🤘', '🔥', '🌟', '🌈', '🌞', '🌻' ];


const greetings = [
  'Heyo',
  'Hello',
  "Salutations my friend",
  "My brother in christ",
  "well, well, well"
];

const meat = [
  "I think you meant to #REASON# @wesbos.com",
  "I'm not the right account, you should #REASON# @wesbos.com",
  "I'm a bot here to tell you you should #REASON# @wesbos.com instead",
];

export function makeANiceThing(reason: string) {
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  const meaty = meat[Math.floor(Math.random() * meat.length)];
  const emoji = emojis[Math.floor(Math.random() * emojis.length)];
  return `${greeting}! ${meaty.replace('#REASON#', reason)} ${emoji}`;
}
