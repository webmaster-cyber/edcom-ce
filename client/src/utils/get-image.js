import Pica from "pica/dist/pica";

export function getImageSize(file, cb) {
  var img = new Image();
  var reader = new FileReader();

  reader.addEventListener('load', function() {
    img.src = reader.result;
  }, false);

  img.onload = () => {
    cb(img.width, img.height);
  }

  reader.readAsDataURL(file);
}

export function getFavicon(file, cb) {
  var img = new Image();
  var reader = new FileReader();

  reader.addEventListener('load', function() {
    img.src = reader.result;
  }, false);

  img.onload = () => {
    cb(img.src, img.width, img.height);
  }

  reader.readAsDataURL(file);
}

export default function getImage(file, size, cb) {
  var img = new Image();
  var reader = new FileReader();

  reader.addEventListener('load', function() {
    img.src = reader.result;
  }, false);

  img.onload = () => {
    if (img.width > size) {
      var canvas = document.createElement('canvas');
      var factor;
      if (img.width > img.height) {
        factor = size/img.width;
      } else {
        factor = size/img.height;
      }

      canvas.width = factor * img.width;
      canvas.height = factor * img.height;

      new Pica().resize(img, canvas, {alpha: true})
        .then(() => {
          cb(canvas.toDataURL('image/jpeg'), canvas.width, canvas.height);
        });
    } else {
      cb(img.src, img.width, img.height);
    }
  }

  reader.readAsDataURL(file);
}
