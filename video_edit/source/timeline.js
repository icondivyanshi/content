// Shared timeline (seconds, on the edited timeline). Used by the compositor and the audio mixer.
const VIDEO_END = 24.06;
const TOTAL = 26.2;
const FPS = 30;

// style keys: n=normal, hand=handwritten, saffron, gold, green(highlighter), red, strike(red strike-through),
// big=giant, ai=gradient mono, mono=code tag
const CHUNKS = [
  [[0.00,"Ab"],[0.52,"toh"],[0.76,"Indian"],[1.06,"parents"],[1.42,"ke"]],
  [[1.54,"favourite","hand"],[1.84,"Modi ji","saffron"],[2.20,"ne"],[2.34,"bhi"]],
  [[2.44,"bol"],[2.64,"diya"],[2.78,"hai"],[2.84,"ki"]],
  [[3.02,"aage"],[3.36,"aane"],[3.52,"wale"],[3.72,"time"],[4.02,"mein"]],
  [[4.16,"kewal"],[4.28,"un"],[4.56,"logon"],[4.78,"ki"]],
  [[4.88,"kadar","gold"],[5.12,"hogi"]],
  [[5.40,"jin"],[5.46,"logon"],[5.74,"ko"],[5.86,"skills","green"]],
  [[6.30,"aati"],[6.52,"hongi"]],
  [[6.72,"na"],[6.92,"ki"],[6.98,"un"],[7.26,"logon"],[7.46,"ki"]],
  [[7.60,"jo"],[7.98,"tie","red"],[8.36,"pant","red"],[8.72,"pehen"],[8.95,"ke"]],
  [[9.14,"degree","strike"],[9.50,"lekar"],[9.78,"ghoomenge"]],
  [[10.60,"Ab"],[10.90,"dekho"]],
  [[11.12,"tum"],[11.30,"chaho"],[11.52,"maano","hand"]],
  [[11.84,"chaho"],[12.02,"na"],[12.22,"maano","hand"]],
  [[12.48,"lekin"],[12.60,"aage"],[12.88,"aane"],[13.00,"wale"],[13.18,"time"],[13.34,"mein"]],
  [[13.42,"kewal"],[13.66,"DO","big"],[13.86,"hi"],[14.00,"tarike"],[14.28,"ke"],[14.32,"log"]],
  [[14.48,"paisa","gold"],[14.72,"kamayenge"]],
  [[15.02,"pehle"],[15.32,"woh"],[15.42,"jinko"],[15.70,"skills","green"],[16.04,"aati"],[16.25,"hain"]],
  [[16.48,"aur"],[16.60,"doosre"],[16.92,"woh"]],
  [[17.12,"jinko"],[17.62,"AI","ai"],[18.00,"use"],[18.20,"karna"],[18.45,"aata"],[18.62,"hai"]],
  [[18.76,"for"],[18.82,"example"]],
  [[19.32,"AI","ai"],[19.48,"se"],[19.60,"websites","mono"],[19.96,"banwana"]],
  [[20.48,"content","mono"],[20.84,"nikalwana"]],
  [[21.62,"ye"],[21.78,"editing","mono"],[22.20,"karwana"]],
  [[22.82,"and"],[23.10,"many"],[23.44,"more"]],
];

const T = {
  titleIn: 0.0, titleToPill: 2.9, pillOut: 12.25,
  skillsCard: 5.86, tie: 7.98, degree: 9.14, stamp: 9.30, cardsOut: 10.30,
  punch: 10.53,
  modeB: 12.40, two: 13.66, coins: 14.48,
  p1: 15.02, p2: 16.60, splice2: 17.17, ai: 17.62,
  example: 18.76, web: 19.60, content: 20.48, edit: 21.78, more: 22.82,
  end: VIDEO_END,
};

const SFX = [
  [0.00,"whoosh"],[2.90,"tick"],[5.86,"ding"],[7.98,"pop"],[9.30,"stamp"],[10.30,"swoosh_down"],
  [10.53,"punch"],[12.40,"whoosh"],[13.66,"boom"],[14.48,"coins"],[15.02,"pop"],[16.60,"shimmer"],
  [18.76,"swoosh_down"],[19.60,"click"],[20.48,"click"],[21.78,"click"],[22.82,"bubbles"],[24.06,"riser"],[24.45,"pop"],
];

if (typeof module !== "undefined") module.exports = { VIDEO_END, TOTAL, FPS, CHUNKS, T, SFX };
