import { Router } from "express";

import { createMarketService } from "../providers";
import { createErrorResponse, createSuccessResponse } from "./response";

const router = Router();
const marketService = createMarketService();

router.get("/us/index/:id", async (request, response) => {
  try {
    const data = await marketService.getUsIndex(request.params.id);

    response.json(
      createSuccessResponse({
        data,
        source: data.source,
        freshness: data.freshness,
        updatedAt: data.updatedAt,
      }),
    );
  } catch (error) {
    response.status(404).json(createErrorResponse(error instanceof Error ? error.message : "us index not found"));
  }
});

router.get("/tw/index/:id", async (request, response) => {
  try {
    const data = await marketService.getTwIndex(request.params.id);

    response.json(
      createSuccessResponse({
        data,
        source: data.source,
        freshness: data.freshness,
        updatedAt: data.updatedAt,
      }),
    );
  } catch (error) {
    response.status(404).json(createErrorResponse(error instanceof Error ? error.message : "tw index not found"));
  }
});

export default router;
