import express, { Request, Response, Application } from "express";
import mongoose, { Document, Schema } from "mongoose";
import cors from "cors";
import dotenv from "dotenv"; // Import dotenv

dotenv.config();

const app: Application = express();
const port = 3001;

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
  })
);

const uri = process.env.MONGODB_URI; 

if (!uri) {
  console.error("MongoDB URI not found in environment variables.");
  process.exit(1); // Exit the app if the URI is not set
}

mongoose
  .connect(uri)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Tipos para os dados
interface AddressType {
  address: string;
  city: string;
  complement: string;
  neighborhood: string;
  postalCode: string;
  state: string;
}

interface DeliveryType {
  bread: string;
  drink: string;
  local: boolean;
  meats: string;
  salad: string;
  sideDish: string;
}

interface PaymentType {
  attachment: any;
  fileName: string;
}

interface DeliveryDocument extends Document {
  delivery: DeliveryType;
  address: AddressType;
  payment: PaymentType;
  shortId: string; // Adicionado para o ID curto
}

const deliverySchema = new Schema<DeliveryDocument>({
  delivery: {
    bread: { type: String, required: true },
    drink: { type: String, required: true },
    local: { type: Boolean, required: true },
    meats: { type: String, required: true },
    salad: { type: String, required: true },
    sideDish: { type: String, required: true },
  },
  address: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    complement: { type: String },
    neighborhood: { type: String, required: true },
    postalCode: { type: String, required: true },
    state: { type: String, required: true },
  },
  payment: {
    attachment: { type: Schema.Types.Mixed, required: false },
    fileName: { type: String, required: true },
  },
  shortId: { type: String, required: true }, // Adicionado
});

const Delivery = mongoose.model<DeliveryDocument>("Delivery", deliverySchema);

interface CounterDocument extends Document {
  date: string;
  lastId: number;
}

const counterSchema = new Schema<CounterDocument>({
  date: { type: String, required: true },
  lastId: { type: Number, required: true },
});

const Counter = mongoose.model<CounterDocument>("Counter", counterSchema);

app.post("/v1/delivery", async (req: any, res: any) => {
  try {
    const { delivery, address, payment } = req.body;

    const today = new Date().toISOString().split("T")[0];

    let counter = await Counter.findOne({ date: today });
    if (!counter) {
      counter = new Counter({ date: today, lastId: 0 });
    }

    if (counter.lastId >= 9999) {
      return res
        .status(400)
        .json({ error: "Limite diário de pedidos atingido" });
    }

    counter.lastId += 1;
    await counter.save();

    const shortId = counter.lastId.toString().padStart(4, "0");

    const newDelivery = new Delivery({ delivery, address, payment, shortId });
    await newDelivery.save();

    res.status(201).json({ id: shortId });
  } catch (error) {
    console.error("Erro ao salvar o pedido:", error);
    res.status(500).json({ error: "Erro ao salvar o pedido" });
  }
});

app.get("/v1/deliveries", async (req: Request, res: Response) => {
  try {
    const deliveries: DeliveryDocument[] = await Delivery.find();
    res.json(deliveries);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar os pedidos" });
  }
});

app.delete("/v1/delivery/:id", async (req: any, res: any) => {
  try {
    const delivery: DeliveryDocument | null = await Delivery.findByIdAndDelete(
      req.params.id
    );
    if (!delivery) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }
    return res.json({ id: delivery._id });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao deletar o pedido" });
  }
});

app.put("/v1/delivery/:id", async (req: any, res: any) => {
  try {
    const { delivery, address, payment } = req.body;
    const updatedDelivery: DeliveryDocument | null =
      await Delivery.findByIdAndUpdate(
        req.params.id,
        { delivery, address, payment },
        { new: true }
      );
    if (!updatedDelivery) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }
    return res.json({ id: updatedDelivery._id });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao atualizar o pedido" });
  }
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
