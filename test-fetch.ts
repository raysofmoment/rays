import fetch from "node-fetch";

async function run() {
  console.log("Fetching list API...");
  const res = await fetch("http://localhost:3000/api/drive/list/1_JLgMB5vrgFu8NPXTHfcB70uahrZ3vVq");
  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}
run();
