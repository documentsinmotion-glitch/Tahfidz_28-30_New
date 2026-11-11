module.exports = {
  content: ['./src/index.html'],
  theme: { extend: {
    colors: {
      emerald: { 50:'#ECFDF5',100:'#D1FAE5',200:'#A7F3D0',300:'#6EE7B7',400:'#34D399',500:'#10B981',600:'#059669',700:'#047857',800:'#065F46',900:'#064E3B',950:'#022C22' },
      gold: { 300:'#E8CF72', 400:'#DDB93F', 500:'#D4AF37', 600:'#B8932A', 700:'#8F7220' }
    },
    fontFamily: { sans: ['"Plus Jakarta Sans"','Inter','system-ui','sans-serif'], arab: ['"Amiri Quran"','Amiri','"Scheherazade New"','serif'] }
  } }
};
