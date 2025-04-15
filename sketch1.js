let matchAnimation1;

const sketch1 = new p5((p) => {
  p.preload = () => {
    matchAnimation1 = new MatchAnimation('canvas1', 'burned', p);
    matchAnimation1.preload();
  };

  p.setup = () => {
    matchAnimation1.setup();
  };

  p.draw = () => {
    matchAnimation1.draw();
  };
}); 