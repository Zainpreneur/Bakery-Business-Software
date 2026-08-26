import "dotenv/config";
import { createApp } from "./app";

const PORT = Number(process.env.PORT) || 4000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`🥐 Bakery API listening on http://localhost:${PORT}`);
});
