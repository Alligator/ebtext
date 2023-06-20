import { registerFont, createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import gifenc from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = gifenc;

function splitString(ctx, text, maxLineLength = 500) {
  let out = '•';
  const lines = text.split('\n');
  for (const line of lines) {
    // this line needs no wrapping
    if (ctx.measureText(line).width < maxLineLength) {
      out += line + '\n•';
      continue;
    }

    let currWidth = 0; // tracked width
    let currLine = ''; // tracked contents of line

    // go through each word and figure out we have enough room
    const words = line.split(' ');
    for (const word of words) {
      // we've got enough
      if (ctx.measureText(currLine + word).width < maxLineLength) {
        currLine += word + ' ';
      // we don't. chop off the space, add a newline, and start a new line
      } else {
        currLine = currLine.slice(0, -1);
        out += currLine + '\n';
        currLine = word + ' ';
      }
    }

    // chop off hanging newline or space and start new line
    currLine = currLine.slice(0, -1);
    out += currLine + '\n•';
  }

  // chop off hanging newline or space, and done.
  out = out.slice(0, -1);
  return out;
}

async function renderEBDialog(text, options) {
  registerFont('./res/earthbound-dialogue.otf', {family: 'Dialogue'});
  registerFont('./res/SenorSaturno-Aw9g.ttf', {family: 'Saturn'});

  const bg = await loadImage(`res/${options.theme}/dialog.png`);
  const arrowBig = await loadImage(`res/${options.theme}/arrowbig.png`);
  const arrowSm = await loadImage(`res/${options.theme}/arrowsm.png`);
  const arrowNone = await loadImage(`res/${options.theme}/arrownone.png`);

  const w = 604, h = 256;
  const baseY = 34;
  const lineHeight = 64;

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d');

  // we need to draw the text to a separate canvas so we can shift the whole line up
  // without going back and drawing it
  const txtCanvas = createCanvas(w, h);
  const txtCtx = txtCanvas.getContext('2d');

  // temp canvas to hold the two lines so we can blit it to the final canvas when we
  // scroll up
  const tempCanvas = createCanvas(w, h * 0.66);
  const tempCtx = tempCanvas.getContext('2d');

  const encoder = new GIFEncoder({ initialCapacity: 500000});

  // setup both canvasses
  const font = options.saturn ? 'normal 42px Saturn' : 'normal 42px Dialogue'
  for (let ictx of [ctx, txtCtx]) {
    ictx.antialias = 'none';
    ictx.font = font;
    ictx.textBaseline = 'top';
    ictx.fillStyle = options.theme == 'plain' ? 'white' : 'rgb(247, 246, 195)';
  }

  // split up the string now that we have the canvas setup
  text = splitString(ctx, text);

  // draw background and add the initial frame
  ctx.drawImage(bg, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  const palette = quantize(imageData.data, 16, { oneBitAlpha: true, format: "rgba4444" });
  const indexed = applyPalette(imageData.data, palette);

  encoder.writeFrame(indexed, w, h, {palette, transparent: true, dispose: 0});

  // reusable shortcut for writing a frame out
  function writeFrame(delay) {
    const indexed = applyPalette(ctx.getImageData(0, 0, w, h).data, palette);
    encoder.writeFrame(indexed, w, h, {delay, dispose: 0, transparent: true});
  }

  // reusable func to draw a blinking cursor for a little bit
  function drawNextPage() {
    for (let i = 0; i < 3; i++) {
      ctx.drawImage(arrowBig, w - 64, h - 32);
      writeFrame(200);
      ctx.drawImage(arrowSm, w - 64, h - 32);
      writeFrame(200);
    }
    ctx.drawImage(arrowNone, w - 64, h - 32);
    writeFrame(0);
  }

  // now clear it so we can start taking advantage of disposal one char at a time
  ctx.clearRect(0, 0, w, h);

  // go through each char and treat it like a command basically
  let x = 56, y = baseY + (options.saturn ? 8 : 0);
  let linesOnScreen = 1;
  let firstLine = true;

  for (let iChar = 0; iChar < text.length; iChar ++) {
    const char = text.charAt(iChar);
    switch (char) {
      case '\n':
        x = 56;
        y += lineHeight;

        // we might be about to overflow the screen
        if (++linesOnScreen > 3) {
          // don't shift immediately if we're about to start a new speaker
          if (text.charAt(iChar + 1) == '•') {
            drawNextPage();
            firstLine = true;
          }

          // don't shift if we're done
          if (iChar + 1 >= text.length) {
            break;
          }

          // draw a new screen, move the bottom two lines up
          // fs.writeFileSync('out_before.gif', txtCanvas.toBuffer());
          ctx.drawImage(bg, 0, 0);
          tempCtx.clearRect(0, 0, w, h);
          tempCtx.drawImage(txtCanvas, 0, 0 - baseY - lineHeight);
          // fs.writeFileSync('out_temp.gif', tempCanvas.toBuffer());
          txtCtx.clearRect(0, 0, w, h);
          txtCtx.drawImage(tempCanvas, 0, baseY);
          // fs.writeFileSync('out_after.gif', txtCanvas.toBuffer());

          ctx.drawImage(txtCanvas, 0, 0);

          y -= lineHeight;
          linesOnScreen--;
        }
        break;

      case '•':
        // don't wait if we just started or just dropped down a line
        if (!firstLine) {
          drawNextPage();
        }
        firstLine = false;

        for (let ictx of [ctx, txtCtx]) {
          ictx.font = '42px Dialogue';
          ictx.fillText(char, x - 26, y - (options.saturn ? 4 : 0));
          ictx.font = font;
        }
        break;

      default:
        for (let ictx of [ctx, txtCtx]) {
          ictx.fillText(char, x, y);
        }
        x += ctx.measureText(char).width;
        writeFrame(20);
        ctx.clearRect(0, 0, w, h);
    }
  }

  // sit on the last frame for a bit
  writeFrame(2000);
  encoder.finish();
  
  return new Promise((resolve, reject) => {
    const buffer = encoder.bytes();
    resolve(buffer);
  });
}

export default renderEBDialog