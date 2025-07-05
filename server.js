import express from "express";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import "dotenv/config.js";

const app = express();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// JSONボディのパースとサイズ制限
app.use(express.json({ limit: "25mb" }));
// 静的ファイルの提供（publicディレクトリ）
app.use(express.static("public"));

// --- Zodスキーマ定義 ---

// 各エンドポイントで共通して使用する栄養素スキーマ
const NutrientSchema = z.object({
    カルシウム: z.number().nullable().describe("カルシウム(mg)").default(0),
    鉄: z.number().nullable().describe("鉄(mg)").default(0),
    ビタミンA: z.number().nullable().describe("ビタミンA(μg)").default(0),
    ビタミンD: z.number().nullable().describe("ビタミンD(μg)").default(0),
    ビタミンB1: z.number().nullable().describe("ビタミンB1(mg)").default(0),
    ビタミンB2: z.number().nullable().describe("ビタミンB2(mg)").default(0),
    ビタミンB6: z.number().nullable().describe("ビタミンB6(mg)").default(0),
    ビタミンB12: z.number().nullable().describe("ビタミンB12(μg)").default(0),
});


// --- APIエンドポイント定義 ---

/**
 * /api/refresh: 時間経過による栄養損失を計算
 */
app.post("/api/refresh", async (req, res) => {
    try {
        const { foodName, amount, temperature, elapsedTime } = req.body;
        const prompt = `あなたは栄養学の専門家です。「${foodName}」${amount}が、${temperature}℃で保存中に${elapsedTime}時間経過した場合の栄養損失量を分析してください。必ず後述のJSONスキーマに厳密に従いfoods配列として出力してください。`;

        const oaRes = await openai.responses.parse({
            model: "gpt-4.1-mini",
            input: [{ role: "user", content: prompt }],
            text: { format: zodTextFormat(NutrientSchema, "save_nutrient_loss") },
            temperature: 0.0,
            top_p: 0.1,
            store: false
        });

        res.json(oaRes.output_parsed);

    } catch (error) {
        console.error("Error in /api/refresh:", error);
        res.status(500).json({ error: "Failed to calculate nutrient loss." });
    }
});

/**
 * /api/restore: 調理による栄養損失を計算
 */
app.post("/api/restore", async (req, res) => {
    try {
        const { foodName, cookingMethod } = req.body;
        const prompt = `あなたは栄養学の専門家です。「${foodName}」を「${cookingMethod}」で調理した場合に、100gあたりで失われる以下の栄養素の量を、科学的知見に基づいてそれぞれ推定してください: カルシウム(mg), 鉄(mg), ビタミンA(μg), ビタミンD(μg), ビタミンB1(mg), ビタミンB2(mg), ビタミンB6(mg), ビタミンB12(μg)。`;

        const oaRes = await openai.responses.parse({
            model: "gpt-4.1-mini",
            input: [{ role: "user", content: prompt }],
            text: { format: zodTextFormat(NutrientSchema, "save_cooking_loss") },
            temperature: 0.0,
            top_p: 0.1,
            store: false
        });

        res.json(oaRes.output_parsed);

    } catch (error) {
        console.error("Error in /api/restore:", error);
        res.status(500).json({ error: "Failed to calculate nutrient loss." });
    }
});

/**
 * /api/replace: 食材代替による栄養素の計算
 */
app.post("/api/replace", async (req, res) => {
    try {
        const { recipeName, ingredientName } = req.body;
        const prompt = `あなたは栄養学の専門家です。一般的な「${recipeName}」のレシピから「${ingredientName}」(一人前の分量と仮定)を除いた場合に失われる以下の栄養素の量を、それぞれ推定してください: カルシウム(mg), 鉄(mg), ビタミンA(μg), ビタミンD(μg), ビタミンB1(mg), ビタミンB2(mg), ビタミンB6(mg), ビタミンB12(μg)。`;

        const oaRes = await openai.responses.parse({
            model: "gpt-4.1-mini",
            input: [{ role: "user", content: prompt }],
            text: { format: zodTextFormat(NutrientSchema, "save_replacement_nutrients") },
            temperature: 0.0,
            top_p: 0.1,
            store: false
        });

        res.json(oaRes.output_parsed);

    } catch (error) {
        console.error("Error in /api/replace:", error);
        res.status(500).json({ error: "Failed to calculate replacement nutrients." });
    }
});

// サーバー起動
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
