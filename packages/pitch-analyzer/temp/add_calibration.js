var fs = require('fs');
var path = require('path');

// Read radar map
var radarMap = {"PR_20230325_142650_session.MP4":71,"PR_20230325_142702_session.MP4":71,"PR_20230325_142729_session.MP4":75,"PR_20230325_142740_session.MP4":64,"PR_20230325_142753_session.MP4":74,"PR_20230325_142807_session.MP4":75,"PR_20230325_142823_session.MP4":66,"PR_20230325_142824_session.MP4":66,"PR_20230325_142852_session.MP4":80,"PR_20230325_142855_session.MP4":80,"PR_20230325_142904_session.MP4":78,"PR_20230325_142907_session.MP4":78,"PR_20230325_142915_session.MP4":64,"PR_20230325_142916_session.MP4":64,"PR_20230325_142948_session.MP4":74,"PR_20230325_142953_session.MP4":74,"PR_20230325_143008_session.MP4":76,"PR_20230325_143027_session.MP4":77,"PR_20230325_143104_session.MP4":61,"PR_20230325_143121_session.MP4":77,"PR_20230325_145814_session.MP4":76,"PR_20230325_145850_session.MP4":67,"PR_20230325_145855_session.MP4":67,"PR_20230325_145905_session.MP4":77,"PR_20230325_145906_session.MP4":77,"PR_20230325_145932_session.MP4":76,"PR_20230325_145936_session.MP4":76,"PR_20230325_145948_session.MP4":66,"PR_20230325_150025_session.MP4":74,"PR_20230325_151033_session.MP4":67,"PR_20230325_151034_session.MP4":67,"PR_20230325_151037_session.MP4":67,"PR_20230325_151104_session.MP4":75,"PR_20230325_151131_session.MP4":66,"PR_20230325_151143_session.MP4":65,"PR_20230325_151204_session.MP4":66};

// Write radar JSON to temp file for the CLI
fs.writeFileSync(path.resolve(__dirname, 'radar.json'), JSON.stringify(radarMap));
console.log('Radar map saved to radar.json');
console.log('Entries:', Object.keys(radarMap).length);
