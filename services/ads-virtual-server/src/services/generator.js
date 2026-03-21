function generateId(prefix) {
   return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
 }
 
 module.exports = { generateId };