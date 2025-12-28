export default function fixTag(t) {
  let newtag = t.toLowerCase().replace(/[^a-zA-Z0-9_ .#]/g, '');
  
  newtag = newtag.replace(/^\s+/, '');
  newtag = newtag.replace(/\s+$/, '');
  
  return newtag;
}

