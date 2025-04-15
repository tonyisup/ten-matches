let matchAnimation3;

const sketch3 = new p5((p) => {
  p.preload = () => {
    matchAnimation3 = new MatchAnimation('canvas3', 'unburned', p);
    matchAnimation3.preload();
  };

  p.setup = () => {
    matchAnimation3.setup();
  };

  p.draw = () => {
    matchAnimation3.draw();
  };
}); 