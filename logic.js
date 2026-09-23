AFRAME.registerComponent('spin-on-gaze', {
  init: function () {
    this.el.addEventListener('mouseenter', () => {
      this.el.setAttribute('animation', {
        property: 'rotation',
        to: '0 360 0',
        loop: true,
        dur: 2000,
        easing: 'linear'
      });
    });

    this.el.addEventListener('mouseleave', () => {
      this.el.removeAttribute('animation');
    });
  }
});
