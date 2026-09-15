import { prisma } from "../database";

export class ExperimentService {
  /**
   * Initialize a new experiment inside a campaign, establishing the variants
   */
  async createExperiment(campaignId: string, hypothesis: string, variants: { name: string, configuration: any }[]) {
    return prisma.marketingExperiment.create({
      data: {
        campaignId,
        hypothesis,
        status: "ACTIVE",
        startDate: new Date(),
        variants: {
          create: variants.map(v => ({
            name: v.name,
            configuration: v.configuration || {}
          }))
        }
      },
      include: {
        variants: true
      }
    });
  }

  /**
   * Directly record an observation from a telemetry stream for a specific variant
   */
  async recordObservation(variantId: string, metric: string, value: number, metadata: any = {}) {
    return prisma.marketingObservation.create({
      data: {
        variantId,
        metric,
        value,
        metadata
      }
    });
  }

  /**
   * Evaluates the active experiment by comparing accumulated QIE across variants.
   * Very basic heuristic: sum the metric values (e.g. QIE).
   */
  async evaluateExperiment(experimentId: string) {
    const experiment = await prisma.marketingExperiment.findUnique({
      where: { id: experimentId },
      include: {
        variants: {
          include: {
            observations: true
          }
        }
      }
    });

    if (!experiment) throw new Error("Experiment not found");

    const results = experiment.variants.map(variant => {
      const qieTotal = variant.observations
        .filter(obs => obs.metric === 'QIE')
        .reduce((sum, obs) => sum + obs.value, 0);

      const clickTotal = variant.observations
        .filter(obs => obs.metric === 'CLICK')
        .reduce((sum, obs) => sum + obs.value, 0);

      return {
        variantId: variant.id,
        name: variant.name,
        qieTotal,
        clickTotal
      };
    });

    // Determine winner based on highest QIE
    results.sort((a, b) => b.qieTotal - a.qieTotal);

    const decision = `Variant '${results[0]?.name || 'None'}' is winning with QIE: ${results[0]?.qieTotal || 0}`;

    await prisma.marketingExperiment.update({
      where: { id: experimentId },
      data: { decision }
    });

    return {
      experimentId,
      hypothesis: experiment.hypothesis,
      decision,
      results
    };
  }
}

export const experimentService = new ExperimentService();
