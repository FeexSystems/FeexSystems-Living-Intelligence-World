 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }import { db } from "../database";

export class ExperimentationService {
  /**
   * Start an experiment on a campaign
   */
  async startExperiment(campaignId, hypothesis, variants) {
    return db.marketingExperiment.create({
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
   * Record an observation for a variant
   */
  async recordObservation(variantId, metric, value, metadata) {
    return db.marketingObservation.create({
      data: {
        variantId,
        metric,
        value,
        metadata: metadata || {}
      }
    });
  }

  /**
   * Conclude an experiment and make a decision
   */
  async concludeExperiment(experimentId, decision) {
    return db.marketingExperiment.update({
      where: { id: experimentId },
      data: {
        status: "COMPLETED",
        endDate: new Date(),
        decision
      }
    });
  }

  /**
   * Get experiment results
   */
  async getExperimentResults(experimentId) {
    const experiment = await db.marketingExperiment.findUnique({
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

    // Aggregate results
    const results = experiment.variants.map(variant => {
      const metrics = variant.observations.reduce((acc, obs) => {
        const bucket = _nullishCoalesce(acc[obs.metric], () => ( { sum: 0, count: 0 }));
        bucket.sum += obs.value;
        bucket.count += 1;
        acc[obs.metric] = bucket;
        return acc;
      }, {} );

      const averages = Object.keys(metrics).reduce((acc, m) => {
        const bucket = metrics[m];
        if (bucket) acc[m] = bucket.sum / bucket.count;
        return acc;
      }, {} );

      return {
        variantId: variant.id,
        name: variant.name,
        averages,
        observationCount: variant.observations.length
      };
    });

    return {
      experimentId: experiment.id,
      hypothesis: experiment.hypothesis,
      status: experiment.status,
      decision: experiment.decision,
      results
    };
  }
}

export const experimentationService = new ExperimentationService();
