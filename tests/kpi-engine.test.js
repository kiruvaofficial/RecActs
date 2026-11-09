const test = require('node:test');
const assert = require('node:assert/strict');

// Pure calculation tests mirroring the spreadsheet formulas
function calculateTargetWeightage(
  workingDays = 22,
  leaveDays = 0,
  dailyHours = 8,
  productiveFactor = 0.9,
  capacityPercent = 1.0
) {
  const availableDays = Math.max(0, workingDays - leaveDays);
  return Math.round(availableDays * dailyHours * productiveFactor * capacityPercent);
}

function calculateTicketDeduction(estHrs, reassignCount) {
  if (reassignCount <= 0) return { deduction: 0, netWeightage: estHrs };
  const rate = reassignCount === 1 ? 0.05 : 0.1;
  const netWeightage = Math.round(estHrs * (1 - rate) * 10) / 10;
  const deduction = Number((estHrs - netWeightage).toFixed(1));
  return { deduction, netWeightage };
}

function getRating(achievementPercent) {
  if (achievementPercent >= 1.0) return 'Excellent';
  if (achievementPercent >= 0.8) return 'Good';
  if (achievementPercent >= 0.6) return 'Average';
  return 'Needs Improvement';
}

test('KPI Spreadsheet Formula: Target Weightage for standard 22-day month', () => {
  // Designers (100% capacity) = 22 * 8 * 0.9 * 1.0 = 158.4 -> 158 hrs
  assert.equal(calculateTargetWeightage(22, 0, 8, 0.9, 1.0), 158);

  // Team Leads (90% capacity) = 22 * 8 * 0.9 * 0.9 = 142.56 -> 143 hrs
  assert.equal(calculateTargetWeightage(22, 0, 8, 0.9, 0.9), 143);

  // Manager (80% capacity) = 22 * 8 * 0.9 * 0.8 = 126.72 -> 127 hrs
  assert.equal(calculateTargetWeightage(22, 0, 8, 0.9, 0.8), 127);

  // Leave adjustment: 2 days leave -> 20 available days -> 20 * 8 * 0.9 * 1.0 = 144 hrs
  assert.equal(calculateTargetWeightage(22, 2, 8, 0.9, 1.0), 144);
});

test('KPI Spreadsheet Formula: Reassignment Deductions', () => {
  // 1st reassign = 5% deduction
  // 120h ticket (Madhan R on REQ-12883) -> 120 * 0.05 = 6.0h deduction, 114.0h net
  const res120 = calculateTicketDeduction(120, 1);
  assert.equal(res120.deduction, 6.0);
  assert.equal(res120.netWeightage, 114.0);

  // 125h ticket (Yogesh on LA-I6923) -> 125 * 0.95 = 118.75 -> rounded to 118.8 net, 6.2h deduction
  const res125 = calculateTicketDeduction(125, 1);
  assert.equal(res125.deduction, 6.2);
  assert.equal(res125.netWeightage, 118.8);

  // 70h ticket (Yogesh on REQ-I2711) -> 70 * 0.95 = 66.5 net, 3.5h deduction
  const res70 = calculateTicketDeduction(70, 1);
  assert.equal(res70.deduction, 3.5);
  assert.equal(res70.netWeightage, 66.5);

  // Total Yogesh deductions = 6.2 + 3.5 = 9.7h
  assert.equal(Number((res125.deduction + res70.deduction).toFixed(1)), 9.7);

  // 0 reassign = 0 deduction
  assert.equal(calculateTicketDeduction(80, 0).deduction, 0);
  assert.equal(calculateTicketDeduction(80, 0).netWeightage, 80);
});

test('KPI Spreadsheet Formula: Rating Bands', () => {
  assert.equal(getRating(1.464), 'Excellent'); // Yogesh 146.4%
  assert.equal(getRating(1.392), 'Excellent'); // Madhan R 139.2%
  assert.equal(getRating(0.85), 'Good');
  assert.equal(getRating(0.62), 'Average'); // Srinath 62.0%
  assert.equal(getRating(0.563), 'Needs Improvement'); // Rasiga 56.3%
  assert.equal(getRating(0.418), 'Needs Improvement'); // Kiruvantham 41.8%
});

test('KPI Spreadsheet: Complete Department KPI Calculations and Roll-Up Verification', () => {
  // 1. Raw Designers
  const designers = [
    { name: 'Sharath', tl: 'Rasiga Priya M', assigned: 5, deducted: 0, net: 5, tickets: 3, est: 5, act: 4 },
    { name: 'Srinath', tl: 'Rasiga Priya M', assigned: 98, deducted: 0, net: 98, tickets: 5, est: 98, act: 92 },
    { name: 'Karuppaiah', tl: 'Rasiga Priya M', assigned: 55, deducted: 0, net: 55, tickets: 4, est: 55, act: 45 },
    { name: 'Dinesh Yadav', tl: 'Rasiga Priya M', assigned: 67, deducted: 0, net: 67, tickets: 6, est: 67, act: 65 },
    { name: 'Madhan R', tl: 'Rasiga Priya M', assigned: 226, deducted: 6.0, net: 220, tickets: 5, est: 226, act: 211 },

    { name: 'Yogesh', tl: 'Kiruvantham C', assigned: 241, deducted: 9.7, net: 231.3, tickets: 4, est: 241, act: 208 },
    { name: 'Hemanth', tl: 'Kiruvantham C', assigned: 30, deducted: 0, net: 30, tickets: 1, est: 30, act: 24 },
    { name: 'Saravana Priya', tl: 'Kiruvantham C', assigned: 1, deducted: 0, net: 1, tickets: 1, est: 1, act: 1 },
    { name: 'Dharshana', tl: 'Kiruvantham C', assigned: 2, deducted: 0, net: 2, tickets: 2, est: 2, act: 2 },
  ];

  // Verify Yogesh individual numbers
  const yg = designers.find((d) => d.name === 'Yogesh');
  const ygAch = yg.net / 158;
  const ygEff = yg.est / yg.act;
  assert.equal((ygAch * 100).toFixed(1), '146.4');
  assert.equal((ygEff * 100).toFixed(1), '115.9');
  assert.equal(getRating(ygAch), 'Excellent');

  // Verify Madhan R individual numbers
  const md = designers.find((d) => d.name === 'Madhan R');
  const mdAch = md.net / 158;
  const mdEff = md.est / md.act;
  assert.equal((mdAch * 100).toFixed(1), '139.2');
  assert.equal((mdEff * 100).toFixed(1), '107.1');
  assert.equal(getRating(mdAch), 'Excellent');

  // 2. Kiruvantham C (TL of 4 designers: Yogesh, Hemanth, Saravana Priya, Dharshana)
  const kiruReports = designers.filter((d) => d.tl === 'Kiruvantham C');
  assert.equal(kiruReports.length, 4);

  const kiruAssignedAvg = kiruReports.reduce((acc, r) => acc + r.assigned, 0) / 4; // 274 / 4 = 68.5
  const kiruDeductedAvg = kiruReports.reduce((acc, r) => acc + r.deducted, 0) / 4; // 9.7 / 4 = 2.425
  const kiruNetAvg = kiruReports.reduce((acc, r) => acc + r.net, 0) / 4; // 264.3 / 4 = 66.075
  const kiruAchievement = kiruNetAvg / 158; // evaluated against standard target 158
  const kiruEstTotal = kiruReports.reduce((acc, r) => acc + r.est, 0); // 274
  const kiruActTotal = kiruReports.reduce((acc, r) => acc + r.act, 0); // 235
  const kiruTicketsTotal = kiruReports.reduce((acc, r) => acc + r.tickets, 0); // 8
  const kiruEfficiency = kiruEstTotal / kiruActTotal;

  assert.equal(kiruAssignedAvg, 68.5);
  assert.equal(kiruDeductedAvg, 2.425);
  assert.equal(kiruNetAvg, 66.075);
  assert.equal((kiruAchievement * 100).toFixed(1), '41.8');
  assert.equal(kiruTicketsTotal, 8);
  assert.equal(kiruEstTotal, 274);
  assert.equal(kiruActTotal, 235);
  assert.equal((kiruEfficiency * 100).toFixed(1), '116.6');
  assert.equal(getRating(kiruAchievement), 'Needs Improvement');

  // 3. Rasiga Priya M (TL of 5 designers: Sharath, Srinath, Karuppaiah, Dinesh Yadav, Madhan R)
  const rasigaReports = designers.filter((d) => d.tl === 'Rasiga Priya M');
  assert.equal(rasigaReports.length, 5);

  const rasigaAssignedAvg = rasigaReports.reduce((acc, r) => acc + r.assigned, 0) / 5; // 451 / 5 = 90.2
  const rasigaDeductedAvg = rasigaReports.reduce((acc, r) => acc + r.deducted, 0) / 5; // 6.0 / 5 = 1.2
  const rasigaNetAvg = rasigaReports.reduce((acc, r) => acc + r.net, 0) / 5; // 445 / 5 = 89.0
  const rasigaAchievement = rasigaNetAvg / 158;
  const rasigaEstTotal = rasigaReports.reduce((acc, r) => acc + r.est, 0); // 451
  const rasigaActTotal = rasigaReports.reduce((acc, r) => acc + r.act, 0); // 417
  const rasigaTicketsTotal = rasigaReports.reduce((acc, r) => acc + r.tickets, 0); // 23
  const rasigaEfficiency = rasigaEstTotal / rasigaActTotal;

  assert.equal(rasigaAssignedAvg, 90.2);
  assert.equal(rasigaDeductedAvg, 1.2);
  assert.equal(rasigaNetAvg, 89.0);
  assert.equal((rasigaAchievement * 100).toFixed(1), '56.3');
  assert.equal(rasigaTicketsTotal, 23);
  assert.equal(rasigaEstTotal, 451);
  assert.equal(rasigaActTotal, 417);
  assert.equal((rasigaEfficiency * 100).toFixed(1), '108.2');
  assert.equal(getRating(rasigaAchievement), 'Needs Improvement');

  // 4. Don Michael (Manager: Equal average of the 2 TL averages)
  const donAssignedAvg = (kiruAssignedAvg + rasigaAssignedAvg) / 2; // (68.5 + 90.2) / 2 = 79.35
  const donDeductedAvg = (kiruDeductedAvg + rasigaDeductedAvg) / 2; // (2.425 + 1.2) / 2 = 1.8125
  const donNetAvg = (kiruNetAvg + rasigaNetAvg) / 2; // (66.075 + 89.0) / 2 = 77.5375
  const donAchievement = donNetAvg / 158;
  const donEstTotal = kiruEstTotal + rasigaEstTotal; // 725
  const donActTotal = kiruActTotal + rasigaActTotal; // 652
  const donTicketsTotal = kiruTicketsTotal + rasigaTicketsTotal; // 31
  const donEfficiency = donEstTotal / donActTotal;

  assert.equal(donAssignedAvg, 79.35);
  assert.equal(donDeductedAvg, 1.8125);
  assert.equal(donNetAvg, 77.5375);
  assert.equal((donAchievement * 100).toFixed(1), '49.1');
  assert.equal(donTicketsTotal, 31);
  assert.equal(donEstTotal, 725);
  assert.equal(donActTotal, 652);
  assert.equal((donEfficiency * 100).toFixed(1), '111.2');
  assert.equal(getRating(donAchievement), 'Needs Improvement');

  // 5. TEAM TOTAL (Counted once across 9 designers)
  const teamTarget = 9 * 158; // 1422
  const teamAssigned = designers.reduce((acc, d) => acc + d.assigned, 0); // 725
  const teamDeducted = Number(designers.reduce((acc, d) => acc + d.deducted, 0).toFixed(1)); // 15.7
  const teamNet = Number(designers.reduce((acc, d) => acc + d.net, 0).toFixed(1)); // 709.3
  const teamAchievement = teamNet / teamTarget;
  const teamEst = designers.reduce((acc, d) => acc + d.est, 0); // 725
  const teamAct = designers.reduce((acc, d) => acc + d.act, 0); // 652
  const teamEfficiency = teamEst / teamAct;

  assert.equal(teamTarget, 1422);
  assert.equal(teamAssigned, 725);
  assert.equal(teamDeducted, 15.7);
  assert.equal(teamNet, 709.3);
  assert.equal((teamAchievement * 100).toFixed(1), '49.9');
  assert.equal(teamEst, 725);
  assert.equal(teamAct, 652);
  assert.equal((teamEfficiency * 100).toFixed(1), '111.2');
});
