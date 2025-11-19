// computeEfficiencies.js - UPDATED
const safeNum = (val) => {
  const num = typeof val === "number" ? val : parseInt(val, 10);
  return !isNaN(num) ? num : 0;
};

const calcEff = (num, den) => {
  if (!den || den <= 0) return 0;
  const efficiency = ((num / den) * 100);
  return parseFloat(efficiency.toFixed(1));
};

export const computeEfficiencies = (doc) => {
  try {
    const data = doc.toObject ? doc.toObject() : doc;
    const o = data.overall || {};

    console.log("📊 Raw data received:", {
      team: data.team || data.first_name,
      overall: o
    });

    // Ensure all categories exist with defaults
    const serve = { 
      aces: safeNum(o.serve?.aces), 
      faults: safeNum(o.serve?.faults), 
      serve_hits: safeNum(o.serve?.serve_hits), 
      total_attempts: safeNum(o.serve?.total_attempts) 
    };

    const attack = { 
      spikes: safeNum(o.attack?.spikes), 
      faults: safeNum(o.attack?.faults), 
      shots: safeNum(o.attack?.shots), 
      total_attempts: safeNum(o.attack?.total_attempts) 
    };

    const digs = { 
      digs: safeNum(o.digs?.digs), 
      faults: safeNum(o.digs?.faults), 
      receptions: safeNum(o.digs?.receptions), 
      total_attempts: safeNum(o.digs?.total_attempts) 
    };

    const block = { 
      kill_blocks: safeNum(o.block?.kill_blocks), 
      faults: safeNum(o.block?.faults), 
      rebounds: safeNum(o.block?.rebounds), 
      total_attempts: safeNum(o.block?.total_attempts) 
    };

    const set = { 
      running_sets: safeNum(o.set?.running_sets), 
      faults: safeNum(o.set?.faults), 
      still_sets: safeNum(o.set?.still_sets), 
      total_attempts: safeNum(o.set?.total_attempts) 
    };

    const reception = { 
      excellents: safeNum(o.reception?.excellents), 
      faults: safeNum(o.reception?.faults), 
      serve_receptions: safeNum(o.reception?.serve_receptions), 
      total_attempts: safeNum(o.reception?.total_attempts) 
    };

    // Compute efficiencies
    const serveEff = calcEff(((serve.aces + serve.serve_hits) - serve.faults), serve.total_attempts);
    const spikeEff = calcEff(((attack.spikes + attack.shots) - attack.faults), attack.total_attempts);
    const digEff = calcEff(((digs.digs + digs.receptions) - digs.faults), digs.total_attempts);
    const blockEff = calcEff(((block.kill_blocks + block.rebounds) - block.kill_blocks), block.total_attempts);
    const setEff = calcEff(((set.running_sets + set.still_sets) - set.faults), set.total_attempts);
    const receptionEff = calcEff(((reception.excellents + reception.serve_receptions) - reception.faults), reception.total_attempts);

    // Overall efficiency
    const pointsScored = attack.spikes + attack.shots + serve.aces + serve.serve_hits + digs.digs + digs.receptions + block.kill_blocks + block.rebounds + still.running_sets + still.still_sets + reception.excellents + reception.serve_receptions;
    const errors = attack.faults + serve.faults + block.faults + reception.faults + digs.faults + set.faults;
    const totalAttempts = attack.total_attempts + serve.total_attempts + digs.total_attempts + set.total_attempts
                         reception.total_attempts + block.total_attempts;

    const overallEff = calcEff(pointsScored - errors)/ totalAttempts;

    console.log("✅ Computed Efficiencies:", {
      team: data.team || data.first_name,
      serveEff,
      spikeEff,
      digEff,
      blockEff,
      setEff,
      receptionEff,
      overallEff,
      pointsScored,
      errors,
      totalAttempts
    });

    return {
      ...data,
      overall: {
        ...o,
        serve: { ...serve, efficiency: serveEff },
        attack: { ...attack, efficiency: spikeEff },
        digs: { ...digs, efficiency: digEff },
        block: { ...block, efficiency: blockEff },
        set: { ...set, efficiency: setEff },
        reception: { ...reception, efficiency: receptionEff },
        overall_efficiency: overallEff,
      },
    };
  } catch (error) {
    console.error("❌ Error in computeEfficiencies:", error);
    return doc; // Return original doc if computation fails
  }
};
