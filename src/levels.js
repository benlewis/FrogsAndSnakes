// Level definitions for Frogs and Snakes
// Each level contains:
// - id: unique identifier
// - name: display name
// - difficulty: "easy" | "medium" | "hard"
// - gridSize: size of the grid (e.g., 5 for 5x5)
// - frog: starting position { position: [col, row] }
// - snakes: array of snakes, each with positions array and orientation
// - logs: array of logs, each with positions array
// - lilyPads: array of lily pad positions
// - par: optimal number of moves to solve

const levels = [
  {
  "id": 4,
  "name": "Triple Threat",
  "difficulty": "easy",
  "gridSize": 5,
  "frog": {
    "position": [
      3,
      0
    ]
  },
  "snakes": [
    {
      "positions": [
        [
          0,
          1
        ],
        [
          1,
          1
        ]
      ],
      "orientation": "horizontal"
    }
  ],
  "logs": [
    {
      "positions": [
        [
          0,
          2
        ]
      ]
    },
    {
      "positions": [
        [
          3,
          2
        ]
      ]
    },
    {
      "positions": [
        [
          2,
          3
        ]
      ]
    }
  ],
  "lilyPads": [
    {
      "position": [
        2,
        2
      ]
    },
    {
      "position": [
        0,
        0
      ]
    },
    {
      "position": [
        0,
        4
      ]
    },
    {
      "position": [
        4,
        4
      ]
    },
    {
      "position": [
        4,
        0
      ]
    }
  ],
  "par": 7
},
  {
    id: 1,
    name: "First Hop",
    difficulty: "easy",
    gridSize: 5,
    frog: { position: [1, 1] },
    snakes: [
      { positions: [[2, 1], [2, 2]], orientation: "vertical" }
    ],
    logs: [
      { positions: [[3, 1]] }
    ],
    lilyPads: [
      { position: [2, 4] }
    ],
    par: 3
  },
  {
    id: 2,
    name: "Snake Charmer",
    difficulty: "easy",
    gridSize: 5,
    frog: { position: [0, 2] },
    snakes: [
      { positions: [[1, 2], [2, 2]], orientation: "horizontal" }
    ],
    logs: [
      { positions: [[3, 2]] }
    ],
    lilyPads: [
      { position: [4, 2] }
    ],
    par: 2
  },
  {
    id: 3,
    name: "Double Trouble",
    difficulty: "medium",
    gridSize: 5,
    frog: { position: [0, 0] },
    snakes: [
      { positions: [[1, 0], [1, 1]], orientation: "vertical" },
      { positions: [[3, 2], [3, 3]], orientation: "vertical" }
    ],
    logs: [
      { positions: [[2, 0]] },
      { positions: [[2, 2]] }
    ],
    lilyPads: [
      { position: [4, 4] }
    ],
    par: 5
  },
  {
    id: 4,
    name: "Triple Threat",
    difficulty: "hard",
    gridSize: 6,
    frog: { position: [0, 0] },
    snakes: [
      { positions: [[1, 0], [1, 1], [1, 2]], orientation: "vertical" },
      { positions: [[3, 2], [4, 2]], orientation: "horizontal" },
      { positions: [[4, 4], [4, 5]], orientation: "vertical" }
    ],
    logs: [
      { positions: [[2, 0]] },
      { positions: [[5, 2]] },
      { positions: [[2, 4]] }
    ],
    lilyPads: [
      { position: [5, 5] }
    ],
    par: 7
  }
];

export default levels;
