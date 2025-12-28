export default function copyTextToClipboard(text, ref) {
  var e = ref || document.body;

  var textArea = document.createElement("textarea");
  textArea.style.position = 'fixed';
  textArea.style.top = 0;
  textArea.style.left = 0;
  textArea.style.width = '2em';
  textArea.style.height = '2em';
  textArea.style.padding = 0;
  textArea.style.border = 'none';
  textArea.style.outline = 'none';
  textArea.style.boxShadow = 'none';
  textArea.style.background = 'transparent';
  textArea.value = text;
  e.appendChild(textArea);
  textArea.select();
  var r = true;
  try {
    if (!document.execCommand('copy'))
      r = false;
  } catch (err) {
    r = false;
  }
  e.removeChild(textArea);
  return r;
}
