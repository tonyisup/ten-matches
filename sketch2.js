let matchAnimation2;

const sketch2 = new p5((p) => {
  p.preload = () => {
    matchAnimation2 = new MatchAnimation('canvas2', 'burning', p);
    matchAnimation2.preload();
  };

  p.setup = () => {
    matchAnimation2.setup();
  };

  p.draw = () => {
    matchAnimation2.draw();
  };
}); 