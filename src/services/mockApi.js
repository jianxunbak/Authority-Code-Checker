export const authorities = [
  "Urban Redevelopment Authority (URA)",
  "Building and Construction Authority (BCA)",
  "Singapore Civil Defence Force (SCDF)",
  "National Environment Agency (NEA)",
  "Public Utilities Board (Sewerage) (PUB (Sewer))",
  "Public Utilities Board (Drainage) (PUB (Drain))",
  "National Parks Board (NPARKS)",
  "Land Transport Authority (Rail) (LTA (Rails))",
  "Land Transport Authority (Vehicle Parking) (LTA (Parking))"
];

export const simulateGeminiResponse = async (query) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            // Simple logic to make the mock response slightly dynamic based on keywords
            let answer = "The regulatory requirements for this query involve consulting the Master Plan guidelines and ensuring compliance with the latest circulars from the relevant agencies.";
            let source = "General Authority Guidelines";
            
            const lowerQuery = query.toLowerCase();
            
            if (lowerQuery.includes("fire") || lowerQuery.includes("safety") || lowerQuery.includes("door")) {
                answer = "Refer to the Fire Code 2018. Ensure that the travel distance to the nearest exit staircase does not exceed the permissible limits for the occupancy load. Fire-rated doors must meet the integrity and insulation criteria specified in Chapter 3.";
                source = "Singapore Civil Defence Force (SCDF)";
            } else if (lowerQuery.includes("plot") || lowerQuery.includes("ratio") || lowerQuery.includes("height")) {
                answer = "The Gross Plot Ratio (GPR) and building height must strictly adhere to the control plans in the URA Master Plan 2019. Any proposed intensification requires a detailed submission demonstrating no adverse impact on the surrounding skyline.";
                source = "Urban Redevelopment Authority (URA)";
            } else if (lowerQuery.includes("drain") || lowerQuery.includes("water")) {
                answer = "Surface runoff must be managed according to the COP on Surface Water Drainage. Ensure that the platform levels are at least 300mm above the adjacent road or ground level to prevent flooding.";
                source = "Public Utilities Board (Drainage) (PUB (Drain))";
            }

            resolve({
                answer: answer,
                source_department: source,
                confidence_score: Number((0.85 + Math.random() * 0.14).toFixed(2)),
                related_rules: ["Rule 4.1.2 - General Compliance", "Section 12 - Submission Procedures"]
            });
        }, 1500); 
    });
};
