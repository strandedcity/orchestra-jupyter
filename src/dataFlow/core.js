define([
        "dataFlow/core_IOModels",
        "dataFlow/core_ComponentModel",
        "dataFlow/enums",
        "dataFlow/pulse"
    ],function(IOModels,ComponentModel, ENUMS, Pulse){
        var DataFlow = {};
        DataFlow.OUTPUT_TYPES = ENUMS.OUTPUT_TYPES; // Better to keep enums separate so datamatcher can access them without all of DataFlow
        DataFlow.INTERPRET_AS = ENUMS.INTERPRET_AS; // Better to keep enums separate so datamatcher can access them without all of DataFlow
        DataFlow.Output = IOModels.Output;
        DataFlow.Input = IOModels.Input;
        DataFlow.Component = ComponentModel;
        DataFlow.Pulse = Pulse;

        return DataFlow;
    }
);
