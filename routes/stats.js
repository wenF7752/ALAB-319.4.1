import express from "express";
import db from "../db/conn.js";

const router = express.Router();

router.get("/", async (req, res) => {
    let collection = await db.collection("grades");

    try {
        let result = await collection
            .aggregate([
                // Step 1: Unwind scores array
                { $unwind: "$scores" },

                // Step 2: Group by learner and class, organizing scores by type
                {
                    $group: {
                        _id: {
                            learner_id: "$learner_id",
                            class_id: "$class_id"
                        },
                        quiz: {
                            $push: {
                                $cond: {
                                    if: { $eq: ["$scores.type", "quiz"] },
                                    then: "$scores.score",
                                    else: "$$REMOVE"
                                }
                            }
                        },
                        exam: {
                            $push: {
                                $cond: {
                                    if: { $eq: ["$scores.type", "exam"] },
                                    then: "$scores.score",
                                    else: "$$REMOVE"
                                }
                            }
                        },
                        homework: {
                            $push: {
                                $cond: {
                                    if: { $eq: ["$scores.type", "homework"] },
                                    then: "$scores.score",
                                    else: "$$REMOVE"
                                }
                            }
                        }
                    }
                },

                // Step 3: Calculate weighted average per class with null checks
                {
                    $project: {
                        learner_id: "$_id.learner_id",
                        class_id: "$_id.class_id",
                        class_weighted_avg: {
                            $sum: [
                                { $multiply: [{ $avg: { $ifNull: ["$exam", []] } }, 0.5] },
                                { $multiply: [{ $avg: { $ifNull: ["$quiz", []] } }, 0.3] },
                                { $multiply: [{ $avg: { $ifNull: ["$homework", []] } }, 0.2] }
                            ]
                        }
                    }
                },

                // Step 4: Group by learner to calculate overall average
                {
                    $group: {
                        _id: "$learner_id",
                        avg_per_class: { $push: "$class_weighted_avg" },
                        overall_avg: { $avg: "$class_weighted_avg" }
                    }
                },

                // Step 5: Add debugging information
                {
                    $project: {
                        learner_id: "$_id",
                        avg_per_class: 1,
                        overall_avg: 1,
                        is_above_50: { $gt: ["$overall_avg", 50] }
                    }
                },

                // Step 6: Facet to calculate statistics
                {
                    $facet: {
                        debug_sample: [
                            { $limit: 100 }  // Show sample of 5 learners for debugging
                        ],
                        learners_above_50: [
                            { $match: { overall_avg: { $gt: 50 } } },
                            { $count: "count" }
                        ],
                        total_learners: [
                            { $count: "count" }
                        ],
                        avg_distribution: [
                            {
                                $bucket: {
                                    groupBy: "$overall_avg",
                                    boundaries: [0, 20, 40, 60, 80, 100],
                                    default: "other",
                                    output: {
                                        count: { $sum: 1 },
                                        learners: { $push: "$learner_id" }
                                    }
                                }
                            }
                        ]
                    }
                }
            ])
            .toArray();

        // Extracting statistics from result
        const debug_info = result[0];
        const learners_above_50_count = debug_info.learners_above_50[0]?.count || 0;
        const total_learners_count = debug_info.total_learners[0]?.count || 0;
        const percentage_above_50 = total_learners_count
            ? (learners_above_50_count / total_learners_count) * 100
            : 0;

        const stats = {
            learners_above_50: learners_above_50_count,
            total_learners: total_learners_count,
            percentage_above_50: percentage_above_50,
            debug: {
                sample_learners: debug_info.debug_sample,
                score_distribution: debug_info.avg_distribution,
            }
        };

        res.status(200).json(stats);

    } catch (error) {
        console.error("Error in /stats route:", error);
        res.status(500).json({
            error: "An error occurred while processing the request",
            details: error.message
        });
    }
});


router.get("/:id", async (req, res) => {
    let collection = await db.collection("grades");
    const classId = Number(req.params.id); // Convert ID parameter to number

    try {
        let result = await collection
            .aggregate([
                // Step 1: Match documents for the specified class_id
                {
                    $match: { class_id: classId }
                },

                // Step 2: Unwind scores array
                { $unwind: "$scores" },

                // Step 3: Group by learner to organize scores by type
                {
                    $group: {
                        _id: "$learner_id",
                        quiz: {
                            $push: {
                                $cond: {
                                    if: { $eq: ["$scores.type", "quiz"] },
                                    then: "$scores.score",
                                    else: "$$REMOVE"
                                }
                            }
                        },
                        exam: {
                            $push: {
                                $cond: {
                                    if: { $eq: ["$scores.type", "exam"] },
                                    then: "$scores.score",
                                    else: "$$REMOVE"
                                }
                            }
                        },
                        homework: {
                            $push: {
                                $cond: {
                                    if: { $eq: ["$scores.type", "homework"] },
                                    then: "$scores.score",
                                    else: "$$REMOVE"
                                }
                            }
                        }
                    }
                },

                // Step 4: Calculate weighted average for each learner
                {
                    $project: {
                        learner_id: "$_id",
                        weighted_avg: {
                            $sum: [
                                { $multiply: [{ $avg: "$exam" }, 0.5] },    // Exam 50%
                                { $multiply: [{ $avg: "$quiz" }, 0.3] },    // Quiz 30%
                                { $multiply: [{ $avg: "$homework" }, 0.2] } // Homework 20%
                            ]
                        }
                    }
                },

                // Step 5: Use $facet to calculate statistics
                {
                    $facet: {
                        learners_above_70: [
                            { $match: { weighted_avg: { $gt: 70 } } },
                            { $count: "count" }
                        ],
                        total_learners: [
                            { $count: "count" }
                        ],
                        // Include debug information
                        score_distribution: [
                            {
                                $bucket: {
                                    groupBy: "$weighted_avg",
                                    boundaries: [0, 60, 70, 80, 90, 100],
                                    default: "other",
                                    output: {
                                        count: { $sum: 1 },
                                        learners: { $push: "$learner_id" }
                                    }
                                }
                            }
                        ],
                        learner_scores: [
                            {
                                $project: {
                                    learner_id: 1,
                                    weighted_avg: 1
                                }
                            }
                        ]
                    }
                },

                // Step 6: Format the final output
                {
                    $project: {
                        class_id: classId,
                        learners_above_70: { $arrayElemAt: ["$learners_above_70.count", 0] },
                        total_learners: { $arrayElemAt: ["$total_learners.count", 0] },
                        percentage_above_70: {
                            $multiply: [
                                {
                                    $divide: [
                                        { $ifNull: [{ $arrayElemAt: ["$learners_above_70.count", 0] }, 0] },
                                        { $ifNull: [{ $arrayElemAt: ["$total_learners.count", 0] }, 1] }
                                    ]
                                },
                                100
                            ]
                        },
                        score_distribution: 1,
                        learner_scores: 1
                    }
                }
            ])
            .toArray();

        // Handle case where no data is found for the class
        if (!result.length) {
            res.status(404).json({
                error: `No data found for class_id: ${classId}`
            });
            return;
        }

        // Format and send the response
        const stats = result[0];
        const response = {
            class_id: stats.class_id,
            statistics: {
                learners_above_70: stats.learners_above_70 || 0,
                total_learners: stats.total_learners || 0,
                percentage_above_70: Number(stats.percentage_above_70?.toFixed(2)) || 0
            },
            debug: {
                score_distribution: stats.score_distribution,
                learner_scores: stats.learner_scores
            }
        };

        res.status(200).json(response);

    } catch (error) {
        console.error("Error in /stats/:id route:", error);
        res.status(500).json({
            error: "An error occurred while processing the request",
            details: error.message
        });
    }
});
export default router;
