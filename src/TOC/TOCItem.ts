import { FlowObjectData } from "flow-component-model";
import TOC from "./TOC";

export default class TOCItem {
    id: string;
    parentId: number ;
    itemId: number ;
    itemName: string = "";
    itemDescription: string = "";
    itemIcon: string = "";
    itemStatus: string = "";
    itemSequence: number = 0;
    itemLevel: number = 0;
    itemInfo: string = "";
    count: number = 0;

    fldItemId: string;
    fldParentId: string;
    fldSequence: string;
    fldTitle: string;
    fldDescription: string;
    fldStatus: string;
    fldCount: string;
    fldIcon: string;
    
    children: Map<number,TOCItem> = new Map();
    objectData: FlowObjectData;

    setItemLevel(level: number) {
        this.itemLevel = level;
        this.children.forEach((child: TOCItem) => {
            child.setItemLevel(level + 1);
        });
    }

    setParent(parentId: number) {
        this.parentId = parentId;
        this.objectData.properties[this.fldParentId].value = parentId;
    }

    setSequence(sequenceId: number) {
        this.itemSequence = sequenceId;
        this.objectData.properties[this.fldSequence].value = sequenceId;
    }

    constructor(toc: TOC) {
        this.fldItemId = toc.getAttribute("IdField","ITEM_ID");
        this.fldParentId = toc.getAttribute("ParentField","PARENT_ID");
        this.fldSequence = toc.getAttribute("SequenceField","SEQUENCE");
        this.fldTitle = toc.getAttribute("TitleField","TITLE");
        this.fldDescription = toc.getAttribute("DescriptionField","DESCRIPTION");
        this.fldStatus = toc.getAttribute("StatusField","STATUS");
        this.fldCount = toc.getAttribute("CountField","COUNT");
        this.fldIcon = toc.getAttribute("IconField","ICON");
    }

    public static fromObjectData(objectData: FlowObjectData,  toc: TOC) : TOCItem{

        let node: TOCItem = new TOCItem(toc);
       
        node.itemLevel = 0;
        node.id = objectData.internalId;
        node.itemId = objectData.properties[node.fldItemId]?.value as number;
        node.parentId = objectData.properties[node.fldParentId]?.value as number;
        node.itemSequence = objectData.properties[node.fldSequence]?.value as number;
        node.count = objectData.properties[node.fldCount]?.value as number;
        node.itemName = objectData.properties[node.fldTitle]?.value as string;
        node.itemDescription = objectData.properties[node.fldDescription]?.value as string;
        node.itemStatus = objectData.properties[node.fldStatus]?.value as string;
        node.itemIcon = objectData.properties[node.fldIcon]?.value as string;
        node.children = new Map();
        node.objectData = objectData;

        return node;
    }

}