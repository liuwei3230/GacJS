Packages.Define("XmlHelper", function () {

    function GetDirectXmlChild(element, name) {
        var xmls = [];
        for (var i = 0; i < element.childNodes.length; i++) {
            var xml = element.childNodes[i];
            if (xml.tagName === name) {
                xmls.push(xml);
            }
        }
        return xmls;
    }

    function Att(xml, name, defaultValue) {
        var value = xml.getAttribute(name);
        if (value === null || value === undefined || value === "") {
            if (defaultValue === undefined) {
                throw new Error("Cannot find attribute \"" + name + "\".");
            }
            return defaultValue;
        }
        else {
            return value;
        }
    }

    /********************************************************************************
    Package
    ********************************************************************************/

    return {
        GetDirectXmlChild: GetDirectXmlChild,
        Att: Att,
    }
});

Packages.Define("Doc.SymbolTree", ["Class", "XmlHelper"], function (__injection__) {
    eval(__injection__);

    /********************************************************************************
    Type
    ********************************************************************************/

    var TypeDecl = Class(PQN("TypeDecl"), {
        ReferencingNameKey: Public(""),
        ReferencingOverloadKeys: Public(null),

        Load: Public.Virtual(function (xml) {
            this.ReferencingNameKey = Att(xml, "ReferencingNameKey");
            this.ReferencingOverloadKeys = GetDirectXmlChild(xml, "ReferencingOverloadKeys").
                map(function (xml) { return GetDirectXmlChild(xml, "Key"); }).
                map(function (xml) { return xml.getAttribute("Value"); });
        }),
    });

    var RefTypeDecl = Class(PQN("RefTypeDecl"), TypeDecl, {
        Name: Public(""),

        Load: Public.Override(function (xml) {
            this.__Static(TypeDecl).Load(xml);

            this.Name = Att(xml, "Name");
        }),
    });

    var SubTypeDecl = Class(PQN("SubTypeDecl"), TypeDecl, {
        Parent: Public(null),
        Name: Public(""),

        Load: Public.Override(function (xml) {
            this.__Static(TypeDecl).Load(xml);

            this.Name = Att(xml, "Name");
            this.Parent = LoadType(GetDirectXmlChild(xml, "Parent")[0]);
        }),
    });

    var DecorationOption = Enum(PQN("Decoration"), {
        Const: 0,
        Volatile: 1,
        Pointer: 2,
        LeftRef: 3,
        RightRef: 4,
        Signed: 5,
        Unsigned: 6,
    });

    var DecorateTypeDecl = Class(PQN("DecorateTypeDecl"), TypeDecl, {
        Element: Public(null),
        Decoration: Public(DecorationOption.Description.Const),

        Load: Public.Override(function (xml) {
            this.__Static(TypeDecl).Load(xml);

            this.Element = LoadType(GetDirectXmlChild(xml, "Element")[0]);
            this.Decoration = DecorationOption.Description[Att(xml, "Decoration")];
        }),
    });

    var ArrayTypeDecl = Class(PQN("ArrayTypeDecl"), TypeDecl, {
        Element: Public(null),
        Expression: Public(""),

        Load: Public.Override(function (xml) {
            this.__Static(TypeDecl).Load(xml);

            this.Element = LoadType(GetDirectXmlChild(xml, "Element")[0]);
            this.Expression = Att(xml, "Expression");
        }),
    });

    var CallingConventionOption = Enum(PQN("CallingConvention"), {
        Default: 0,
        CDecl: 1,
        ClrCall: 2,
        StdCall: 3,
        FastCall: 4,
        ThisCall: 5,
        VectorCall: 6,
    });

    var FunctionTypeDecl = Class(PQN("FunctionTypeDecl"), TypeDecl, {
        CallingConvention: Public(CallingConventionOption.Description.Default),
        ReturnType: Public(null),
        Parameters: Public(null),
        Const: Public(false),

        Load: Public.Override(function (xml) {
            this.__Static(TypeDecl).Load(xml);

            this.CallingConvention = CallingConventionOption.Description[Att(xml, "CallingConvention")];
            this.Const = Att(xml, "Const") === true;
            this.ReturnType = LoadType(GetDirectXmlChild(xml, "ReturnType")[0]);
            this.Parameters = GetDirectXmlChild(xml, "Parameters")[0].
                childNodes.
                filter(function (xml) { return xml.tagName !== undefined; }).
                map(LoadType);
        }),
    });

    var ClassMemberTypeDecl = Class(PQN("ClassMemberTypeDecl"), TypeDecl, {
        Element: Public(null),
        ClassType: Public(null),

        Load: Public.Override(function (xml) {
            this.__Static(TypeDecl).Load(xml);

            this.Element = LoadType(GetDirectXmlChild(xml, "Element")[0]);
            this.ClassType = LoadType(GetDirectXmlChild(xml, "ClassType")[0]);
        }),
    });

    var GenericTypeDecl = Class(PQN("GenericTypeDecl"), TypeDecl, {
        Element: Public(null),
        TypeArguments: Public(null),

        Load: Public.Override(function (xml) {
            this.__Static(TypeDecl).Load(xml);

            this.Element = LoadType(GetDirectXmlChild(xml, "Element")[0]);
            this.TypeArguments = GetDirectXmlChild(xml, "TypeArguments")[0].
                childNodes.
                filter(function (xml) { return xml.tagName !== undefined; }).
                map(LoadType);
        }),
    });

    var DeclTypeDecl = Class(PQN("DeclTypeDecl"), TypeDecl, {
        Expression: Public(""),

        Load: Public.Override(function (xml) {
            this.__Static(TypeDecl).Load(xml);

            this.Expression = Att(xml, "Expression");
        }),
    });

    var VariadicArgumentTypeDecl = Class(PQN("VariadicArgumentTypeDecl"), TypeDecl, {
        Element: Public(null),

        Load: Public.Override(function (xml) {
            this.__Static(TypeDecl).Load(xml);

            this.Element = LoadType(GetDirectXmlChild(xml, "Element")[0]);
        }),
    });

    var ConstantTypeDecl = Class(PQN("ConstantTypeDecl"), TypeDecl, {
        Value: Public(""),

        Load: Public.Override(function (xml) {
            this.__Static(TypeDecl).Load(xml);

            this.Value = Att(xml, "Value");
        }),
    });

    /********************************************************************************
    Symbol
    ********************************************************************************/

    var AccessOption = Enum(PQN("Access"), {
        Public: 0,
        Protected: 1,
        Private: 2,
    });

    var domParser = new DOMParser();

    var SymbolDecl = Class(PQN("SymbolDecl"), {
        Access: Public(AccessOption.Description.Public),
        Name: Public(""),
        Children: Public(null),
        Document: Public(null),
        Tags: Public(null),
        NameKey: Public(""),
        OverloadKey: Public(""),

        Load: Public.Virtual(function (xml) {
            this.Access = AccessOption.Description[Att(xml, "Access")];
            this.Name = Att(xml, "Name");
            this.Document = Att(xml, "Document", null);
            if (this.Document !== null) {
                this.Document = domParser.parseFromString(this.Document, "text/xml");
            }
            this.Tags = Att(xml, "Tags").split(";");
            this.NameKey = Att(xml, "NameKey", null);
            this.OverloadKey = Att(xml, "OverloadKey", null);

            var childXmls = GetDirectXmlChild(xml, "Children");
            if (childXmls.length === 0) {
                this.Children = [];
            }
            else {
                this.Children = childXmls[0].map(LoadSymbol);
            }
        }),
    });

    var TypeParameterDecl = Class(PQN("TypeParameterDecl"), SymbolDecl, {

        Load: Public.Override(function (xml) {
            this.__Static(SymbolDecl).Load(xml);
        }),
    });

    var TemplateDecl = Class(PQN("TemplateDecl"), SymbolDecl, {
        TypeParameters: Public(null),
        Specialization: Public(null),
        Element: Public(null),

        Load: Public.Override(function (xml) {
            this.__Static(SymbolDecl).Load(xml);
        }),
    });

    var ClassTypeOption = Enum(PQN("ClassType"), {
        Class: 0,
        Struct: 1,
        Union: 2,
    });

    var BaseTypeDecl = Class(PQN("BaseTypeDecl"), SymbolDecl, {
        Type: Public(null),

        Load: Public.Override(function (xml) {
            this.__Static(SymbolDecl).Load(xml);
        }),
    });

    var ClassDecl = Class(PQN("ClassDecl"), SymbolDecl, {
        ClassType: Public(ClassTypeOption.Description.Class),
        BaseTypes: Public(null),

        Load: Public.Override(function (xml) {
            this.__Static(SymbolDecl).Load(xml);
        }),
    });

    var VarDecl = Class(PQN("VarDecl"), SymbolDecl, {
        Type: Public(null),
        Static: Public(false),

        Load: Public.Override(function (xml) {
            this.__Static(SymbolDecl).Load(xml);
        }),
    });

    var VirtualOption = Enum(PQN("Virtual"), {
        Static: 0,
        Normal: 1,
        Virtual: 2,
        Abstract: 3,
    });

    var FunctionOption = Enum(PQN("Function"), {
        Constructor: 0,
        Destructor: 1,
        Function: 2,
    });

    var FuncDecl = Class(PQN("FuncDecl"), SymbolDecl, {
        Type: Public(null),
        Virtual: Public(VirtualOption.Description.Normal),
        Function: Public(FunctionOption.Description.Function),

        Load: Public.Override(function (xml) {
            this.__Static(SymbolDecl).Load(xml);
        }),
    });

    var Grouping = Enum(PQN("Grouping"), {
        Union: 0,
        Struct: 1,
    });

    var GroupedFieldDecl = Class(PQN("GroupedFieldDecl"), SymbolDecl, {
        Grouping: Public(Grouping.Description.Struct),

        Load: Public.Override(function (xml) {
            this.__Static(SymbolDecl).Load(xml);
        }),
    });

    var EnumItemDecl = Class(PQN("EnumItemDecl"), SymbolDecl, {

        Load: Public.Override(function (xml) {
            this.__Static(SymbolDecl).Load(xml);
        }),
    });

    var EnumDecl = Class(PQN("EnumDecl"), SymbolDecl, {
        EnumClass: Public(false),

        Load: Public.Override(function (xml) {
            this.__Static(SymbolDecl).Load(xml);
        }),
    });

    var TypedefDecl = Class(PQN("TypedefDecl"), SymbolDecl, {
        Type: Public(null),

        Load: Public.Override(function (xml) {
            this.__Static(SymbolDecl).Load(xml);
        }),
    });

    /********************************************************************************
    Type Deserialization
    ********************************************************************************/

    function LoadType(xml) {
        var type = Packages.Types(PQN(xml.tagName));
        var obj = new type;
        obj.Load(xml);
        return obj;
    }

    /********************************************************************************
    Symbol Deserialization
    ********************************************************************************/

    function LoadSymbol(xml) {
        var type = Packages.Types(PQN(xml.tagName));
        var obj = new type;
        obj.Load(xml);
        return obj;
    }

    /********************************************************************************
    Package
    ********************************************************************************/

    return {
        TypeDecl: TypeDecl,
        RefTypeDecl: RefTypeDecl,
        SubTypeDecl: SubTypeDecl,
        DecorationOption: DecorationOption,
        DecorateTypeDecl: DecorateTypeDecl,
        ArrayTypeDecl: ArrayTypeDecl,
        CallingConventionOption: CallingConventionOption,
        FunctionTypeDecl: FunctionTypeDecl,
        ClassMemberTypeDecl: ClassMemberTypeDecl,
        GenericTypeDecl: GenericTypeDecl,
        DeclTypeDecl: DeclTypeDecl,
        VariadicArgumentTypeDecl: VariadicArgumentTypeDecl,
        ConstantTypeDecl: ConstantTypeDecl,

        AccessOption: AccessOption,
        SymbolDecl: SymbolDecl,
        TypeParameterDecl: TypeParameterDecl,
        TemplateDecl: TemplateDecl,
        ClassTypeOption: ClassTypeOption,
        BaseTypeDecl: BaseTypeDecl,
        ClassDecl: ClassDecl,
        VarDecl: VarDecl,
        VirtualOption: VirtualOption,
        FunctionOption: FunctionOption,
        FuncDecl: FuncDecl,
        Grouping: Grouping,
        GroupedFieldDecl: GroupedFieldDecl,
        EnumItemDecl: EnumItemDecl,
        EnumDecl: EnumDecl,
        TypedefDecl: TypedefDecl,
    }
})