define(["dataFlow/core"],function(DataFlow){

    // {
    //     functionName: "",
    //     componentPrettyName: "",
    //     module: "pandas",
    //     label: "",
    //     desc: "",
    //     inputs: [],
    //     outputs: [],
    //     pythonTemplate: ""
    // }

    return [
        {
            functionName: "NumberComponent",
            componentPrettyName: "Number",
            module: "base.numeric",
            label: "base.numeric.number",
            desc: "Holds a list of numbers. For short lists, you can enter the numbers directly into the component.",
            inputs: [
                {required: false, shortName: "N", type: DataFlow.OUTPUT_TYPES.NUMBER}
            ],
            outputs: [
                {shortName: "N", type: DataFlow.OUTPUT_TYPES.NUMBER}
            ],
            pythonTemplate: "<%= RESULT %> = <%= IN_N %>\n" // OUTPUT = N
        },
        {
            functionName: "Add",
            componentPrettyName: "Add",
            module: "base.numeric",
            label: "base.numeric.add",
            desc: "Add two inputs together. The two inputs can be any objects where vectorized operations are supported, including simple numbers, numpy arrays, pandas series, etc.",
            inputs: [
                {required: true, shortName: "A", type: DataFlow.OUTPUT_TYPES.WILD},
                {required: true, shortName: "B", type: DataFlow.OUTPUT_TYPES.WILD}
            ],
            outputs: [
                {shortName: "N", type: DataFlow.OUTPUT_TYPES.WILD}
            ],
            pythonTemplate: "<%= RESULT %> = <%= IN_A %> + <%= IN_B %>\n" // OUTPUT = A + B
        },
        {
            functionName: "Subtract",
            componentPrettyName: "Subtract",
            module: "base.numeric",
            label: "base.numeric.subtract",
            desc: "Subtract B from A. The two inputs can be any objects where vectorized operations are supported, including simple numbers, numpy arrays, pandas series, etc.",
            inputs: [
                {required: true, shortName: "A", type: DataFlow.OUTPUT_TYPES.WILD},
                {required: true, shortName: "B", type: DataFlow.OUTPUT_TYPES.WILD}
            ],
            outputs: [
                {shortName: "N", type: DataFlow.OUTPUT_TYPES.WILD}
            ],
            pythonTemplate: "<%= RESULT %> = <%= IN_A %> - <%= IN_B %>\n" // OUTPUT = A - B
        },
    ]
});
