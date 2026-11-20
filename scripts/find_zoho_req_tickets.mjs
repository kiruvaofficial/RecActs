import fs from 'fs';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => l.split('=').map(s => s.trim().replace(/^"|"$/g, '')))
);

const REQUIREMENT_OPT_ID = '101301000007227151';

async function findZohoRequirementTickets() {
  const tokenRes = await fetch(
    `https://accounts.zoho.com/oauth/v2/token?refresh_token=${env.ZOHO_REFRESH_TOKEN}&client_id=${env.ZOHO_CLIENT_ID}&client_secret=${env.ZOHO_CLIENT_SECRET}&grant_type=refresh_token`,
    { method: 'POST' }
  );
  const { access_token } = await tokenRes.json();
  const headers = { Authorization: `Zoho-oauthtoken ${access_token}` };
  const portalId = '730202335';
  const projId = '101301000000010271';
  const sprintId = '101301000007439160';

  let allSprintItems = [];
  let index = 1;
  let hasMore = true;
  while (hasMore && index <= 1000) {
    const url = `https://sprintsapi.zoho.com/zsapi/team/${portalId}/projects/${projId}/sprints/${sprintId}/item/?action=data&index=${index}&range=100`;
    const res = await fetch(url, { headers });
    const data = await res.json();
    const props = data.item_prop;
    if (data.itemIds && data.itemJObj) {
      for (const id of data.itemIds) {
        const arr = data.itemJObj[id];
        const item = { id };
        for (const [k, idx] of Object.entries(props)) {
          item[k] = arr[idx];
        }
        allSprintItems.push(item);
      }
      if (data.itemIds.length < 100) hasMore = false;
      else index += 100;
    } else {
      hasMore = false;
    }
  }

  console.log(`Total Sprint 95 items in Zoho: ${allSprintItems.length}`);

  const reqItems = [];
  const concurrency = 15;
  for (let i = 0; i < allSprintItems.length; i += concurrency) {
    const chunk = allSprintItems.slice(i, i + concurrency);
    await Promise.all(
      chunk.map(async (item) => {
        try {
          const detailUrl = `https://sprintsapi.zoho.com/zsapi/team/${portalId}/projects/${projId}/item/${item.id}/?action=details`;
          const dRes = await fetch(detailUrl, { headers });
          if (!dRes.ok) return;
          const dData = await dRes.json();
          const dProps = dData.item_prop;
          const dArr = dData.itemJObj ? dData.itemJObj[item.id] || Object.values(dData.itemJObj)[0] : null;
          if (!dArr || !dProps) return;

          const deptVal = dProps.UDF_PKL20 !== undefined ? dArr[dProps.UDF_PKL20] : null;
          if (String(deptVal) === REQUIREMENT_OPT_ID) {
            reqItems.push({
              id: item.id,
              itemNo: item.itemNo,
              name: item.itemName,
              status: item.statusName,
              deptVal
            });
          }
        } catch (e) {}
      })
    );
  }

  console.log(`\n========================================`);
  console.log(`Found ${reqItems.length} items with Department = Requirement in Zoho Sprints!`);
  const byStatus = new Map();
  for (const r of reqItems) {
    byStatus.set(r.status, (byStatus.get(r.status) || 0) + 1);
  }
  for (const [st, count] of byStatus.entries()) {
    console.log(`  ${st}: ${count}`);
  }
  console.log('\nTicket List:');
  for (const r of reqItems) {
    console.log(`  - I${r.itemNo} [${r.status}] ${r.name.slice(0, 55)}`);
  }
}

findZohoRequirementTickets().catch(console.error);
