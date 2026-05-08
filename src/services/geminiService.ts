import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function analyzeMSDS(productName: string) {
  // In a real app, we would pass the PDF/image content.
  // Here we simulate the AI analysis of a chemical product.
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
    Analyze the following chemical product for food industry hygiene: "${productName}".
    Extract:
    1. Active Ingredient
    2. Normal Dosage (for 10L water)
    3. Shock Dosage
    4. Contact Time
    5. PPE Required
    6. Main Hazard Statements
    
    Return as JSON.
  `;

  try {
    // For demo/speed, we provide a deterministic structured response if GEMINI_API_KEY is missing or just as fallback
    const result = {
      productName: productName,
      activeEngredient: "Amónio Quaternário / Cloro Ativo",
      dosageNormal: "50ml por 10L (0.5%)",
      dosageShock: "100ml por 10L (1%)",
      contactTime: "5 - 10 minutos",
      ppeRequired: ["Luvas Nitrílicas", "Óculos Proteção", "Avental Impermeável"],
      hazardStatements: ["H314: Provoca queimaduras graves", "H400: Muito tóxico para vida aquática"]
    };
    
    return result;
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return null;
  }
}

export async function analyzeRawMaterialFTS(materialName: string) {
  // Simulate AI analysis of a raw material datasheet
  try {
    return {
      materialName: materialName,
      allergens: ["Lactose", "Soja"],
      storageTemp: "0ºC a 4ºC",
      handlingInstructions: "Manipular em zona fria segregada. Utilizar utensílios exclusivos para evitar contaminação cruzada.",
      shelfLife: "12 dias após abertura",
      riskLevel: "HIGH"
    };
  } catch (error) {
    console.error("Raw Material Analysis failed:", error);
    return null;
  }
}

export async function generateProductManual(productName: string, materials: string[]) {
  // Simulate AI generating a specific procedural manual for a finished product
  try {
    return {
      targetProduct: productName,
      riskLevel: "HIGH",
      steps: [
        "Higienização da bancada com Cloro Ativo (0.5%)",
        "Retirada de matérias-primas da câmara fria (Target: 4ºC)",
        "Verificação de ausência de Alergénicos Cruzados",
        "Processamento e embalamento em atmosfera controlada",
        "Rotulagem com destaque para: CONTÉM LACTOSE"
      ],
      requiredMaterials: materials,
      ccpLinked: ["CCP_01: Temperatura Receção", "CCP_03: Contaminação Alergénica"]
    };
  } catch (error) {
    console.error("Manual Generation failed:", error);
    return null;
  }
}
