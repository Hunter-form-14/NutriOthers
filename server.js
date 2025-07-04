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

// /api/refresh 用のスキーマ
const RefreshResponseSchema = z.object({
    nutrient: z.string().describe("失われた栄養素の名前"),
    amount: z.number().describe("失われた栄養素の量"),
    unit: z.string().describe("量の単位 (例: mg, μg)")
});

// /api/restore 用のスキーマ
const RestoreResponseSchema = z.object({
    nutrient: z.string().describe("調理で失われた栄養素の名前"),
    amount: z.number().describe("100gあたりで失われた栄養素の量"),
    unit: z.string().describe("量の単位 (例: mg, μg)")
});

// /api/replace 用のスキーマ
const ReplaceResponseSchema = z.object({
    nutrients: z.array(z.object({
        name: z.string().describe("代替すべき栄養素の名前"),
        amount: z.number().describe("代替すべき栄養素の量"),
        unit: z.string().describe("量の単位 (例: mg, μg)")
    })).describe("代替すべき栄養素のリスト")
});


// --- APIエンドポイント定義 ---

/**
 * /api/refresh: 時間経過による栄養損失を計算
 */
app.post("/api/refresh", async (req, res) => {
    try {
        const { foodName, elapsedTime } = req.body;
        const prompt = `あなたは栄養学の専門家です。「${foodName}」を調理後、${elapsedTime}時間経過した場合に最も失われやすい主要な栄養素を1つ特定し、その損失量を科学的知見に基づいて推定してください。`;

        const oaRes = await openai.responses.parse({
            model: "gpt-4o",
            input: [{ role: "user", content: prompt }],
            text: { format: zodTextFormat(RefreshResponseSchema, "save_nutrient_loss") },
            temperature: 0.0,
            top_p: 0.1,
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
        const prompt = `あなたは栄養学の専門家です。「${foodName}」を「${cookingMethod}」で調理した場合に、100gあたりで最も失われやすい主要な栄養素を1つ特定し、その損失量を科学的知見に基づいて推定してください。`;

        const oaRes = await openai.responses.parse({
            model: "gpt-4o",
            input: [{ role: "user", content: prompt }],
            text: { format: zodTextFormat(RestoreResponseSchema, "save_cooking_loss") },
            temperature: 0.0,
            top_p: 0.1,
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
        const prompt = `あなたは栄養学の専門家です。一般的な「${recipeName}」のレシピから「${ingredientName}」(一人前の分量と仮定)を除いた場合、失われる主要な栄養素を1〜2つ特定し、その量を推定してください。`;

        const oaRes = await openai.responses.parse({
            model: "gpt-4o",
            input: [{ role: "user", content: prompt }],
            text: { format: zodTextFormat(ReplaceResponseSchema, "save_replacement_nutrients") },
            temperature: 0.0,
            top_p: 0.1,
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
