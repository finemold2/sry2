const parsePt = (v) => {
  if (!v) return undefined;
  const m = v.match(/(-?[\d.]+)\s*(pt|px)?/);
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  return (m[2] || 'px') === 'px' ? Math.round(n * 0.75 * 10) / 10 : Math.round(n * 10) / 10;
};

console.log('parsePt("0px"):', parsePt('0px'));
console.log('if (parsePt("0px")) truthy:', !!parsePt('0px'));
console.log('if (parsePt("0px") != null) truthy:', parsePt('0px') != null);
