import colors from 'colors';

export const heartIcon = colors.red('❤');
export const shareIcon = colors.dim('↻');
export const replyIcon = colors.red('↩');


export function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
