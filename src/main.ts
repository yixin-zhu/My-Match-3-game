import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("找不到页面根节点");

app.innerHTML = `
  <main class="page">
    <h1>公平叠牌</h1>
    <p>每关都有解。花色种类决定难度。</p>
  </main>
`;
