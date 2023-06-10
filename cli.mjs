import fs from 'fs';
import renderEBDialog from "./index.mjs"

const opts = {
  theme: 'plain',
  saturn: false
}

const manylines = "line 1\nline 2\nline 3\nline 4\nline 5";
const longline = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam sed justo arcu. Sed ut urna finibus ipsum volutpat malesuada. Suspendisse euismod metus vitae lectus pellentesque fermentum. Nulla facilisi. Sed vulputate ligula vel nisi ullamcorper, sit amet tempor mauris convallis. Proin tincidunt neque ut velit venenatis cursus in at eros. Curabitur ac felis in mi laoreet consectetur. Vivamus quis nisl semper, ullamcorper neque in, placerat neque. Phasellus faucibus pharetra nulla vel egestas. Cras in ex nec tellus volutpat mollis. Nulla pulvinar, magna vestibulum vestibulum sodales, ipsum tellus molestie mauris, sed sagittis leo eros vel ipsum. Integer consequat risus eget tristique malesuada. Nulla vitae dui eget ligula convallis imperdiet eget eu lectus.";
const mom = "What was that noise?\nNess, you don't seem scared. Are you nuts?\nAnd now you want to go check it out? ...oh ...okay.\nYou'll sneak out of your room anyway, even if I asked you not to.\nAt least change out of your jammies before you go.";
const short = "Hello world!";

renderEBDialog(mom, opts).then(gif => {
  fs.writeFileSync('ebtext.gif', gif)
})
