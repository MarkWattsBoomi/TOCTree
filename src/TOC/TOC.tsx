import React, { CSSProperties } from 'react';

import { modalDialogButton, eLoadingState, FlowComponent, FlowObjectData, FlowObjectDataProperty, FlowOutcome, ePageActionBindingType, eContentType, FlowMessageBox, FlowObjectDataArray, FlowField } from 'flow-component-model';
import '../css/toc.css';
import TOCNode from './TOCNode';
import TOCItem from './TOCItem';
import FlowContextMenu from 'flow-component-model/lib/Dialogs/FlowContextMenu';

//declare const manywho: IManywho;
declare const manywho: any;

export enum eDebugLevel {
    error = 0,
    warning = 1,
    info = 2,
    verbose = 3
}

export default class TOC extends FlowComponent {
    version: string="1.0.0";
    context: any;
    debugLevel: eDebugLevel = eDebugLevel.error;

    selectedNodeId: number;
    //nodeTree: Map<number,TOCItem>;
    nodeElementTree: Array<any>;
    TOCNodes: Map<number,TOCNode> = new Map();
    flatTree: Map<number,TOCItem> = new Map();

    draggedNode: number;

    contextMenu: FlowContextMenu;

    defaultExpanded: boolean = true;
    expansionPath: number[] = [];
    filterExpansionPath: number[] = [];

    matchingNodes:  number[];
    changedNodes:  number[] = [];

    lastContent: any = (<div></div>);

    searchBox: HTMLInputElement;

    maxResults: number = 30;
    absoluteMaxResults: number = 1000;

    messageBox: FlowMessageBox;

    constructor(props: any) {
        super(props);

        this.handleMessage = this.handleMessage.bind(this);
        this.convertNode = this.convertNode.bind(this);
        this.flowMoved = this.flowMoved.bind(this);
        this.doOutcome = this.doOutcome.bind(this);
        this.expand = this.expand.bind(this);
        this.collapse = this.collapse.bind(this);
        this.setNode = this.setNode.bind(this);
        this.showContextMenu = this.showContextMenu.bind(this);
        this.hideContextMenu = this.hideContextMenu.bind(this);  
        this.showAll = this.showAll.bind(this);
        this.filterTree = this.filterTree.bind(this);
        this.filterTreeClear = this.filterTreeClear.bind(this);
        this.expandToSelected = this.expandToSelected.bind(this);
        this.expandToFilter = this.expandToFilter.bind(this);
        this.searchKeyEvent = this.searchKeyEvent.bind(this);
        this.drawResults = this.drawResults.bind(this);

        this.dbg = this.dbg.bind(this);

        let dbl: number = parseInt(this.getAttribute("DebugLevel","0"));
              this.debugLevel = dbl || eDebugLevel.error ;
        this.debug("Debug Level = " + this.debugLevel, eDebugLevel.info);

        this.maxResults = parseInt(this.getAttribute("MaxSearchResults","30"));
        this.absoluteMaxResults = parseInt(this.getAttribute("AbsoluteMaxSearchResults","1000"));
    
        this.defaultExpanded=this.getAttribute("StartExpanded","false").toLowerCase() === "true";
    }

    debug(message: string, debugLevel: eDebugLevel) {
        if(debugLevel.valueOf() <= this.debugLevel.valueOf()) {
            console.log(message);
        }
    }

    async flowMoved(xhr: any, request: any) {
        let me: any = this;
        if(xhr.invokeType==="FORWARD") {
            if(this.loadingState !== eLoadingState.ready){
                window.setTimeout(function() {me.flowMoved(xhr, request)},500);
            }
            else {
                this.buildFlatTreeFromModel();
                this.refreshSelectedFromState();
            }
        }
        
    }

    async componentDidMount() {
        //will get this from a component attribute
        await super.componentDidMount();
        
        // build tree
        this.buildFlatTreeFromModel();
        
        (manywho as any).eventManager.addDoneListener(this.flowMoved, this.componentId);

        this.refreshSelectedFromState();
    }

    async refreshSelectedFromState() {
        let state: FlowObjectData = this.getStateValue() as FlowObjectData;
        this.selectedNodeId = undefined;
         // if there's a clicked state attribute then set it
         if(this.getAttribute("SelectedState")) {
            let clickedState: FlowField;
            if(!this.fields[this.getAttribute("SelectedState")]) {
                clickedState = await this.loadValue(this.getAttribute("SelectedState"));
            } 
            else {
                clickedState = this.fields[this.getAttribute("SelectedState")]
            }
            this.selectedNodeId=(clickedState.value as FlowObjectData).properties[this.getAttribute("IdField","ITEM_ID")]?.value as number;
        }

        this.expandToSelected();
        this.forceUpdate();
    }

    async componentWillUnmount() {
        await super.componentWillUnmount();
        (manywho as any).eventManager.removeDoneListener(this.componentId);
        this.debug("unmount toc", eDebugLevel.verbose);
    }

    setSearchBox(element: HTMLInputElement) {
        if(element){
            this.searchBox = element;
            this.searchBox.addEventListener("keyup",this.searchKeyEvent);
        }
        else {
            if(this.searchBox) {
                this.searchBox.removeEventListener("keyup",this.searchKeyEvent);
            }
        }
    }

    searchKeyEvent(event: KeyboardEvent) {
        if(event.key.toLowerCase()==="enter") {
            this.filterTree();
        }
    }

    setNode(key: number, element: TOCNode) {
        if(element) {
            this.TOCNodes.set(key,element);
        }
        else {
            if(this.TOCNodes.has(key)) {
                this.TOCNodes.delete(key);
            }
        }
    }

    getNode(key: number): TOCNode {
        return this.TOCNodes.get(key);
    }

    convertNode(source: FlowObjectData) : FlowObjectData {
        let result: FlowObjectData;
        if(this.model.dataSource.items && this.model.dataSource.items.length > 0) {
            let targettype: string = this.model.dataSource.items[0].developerName;
            result = FlowObjectData.newInstance(targettype);
            Object.values(source.properties).forEach((prop: FlowObjectDataProperty) => {
                if(prop.contentType !== eContentType.ContentObject && prop.contentType !== eContentType.ContentList) {
                    result.addProperty(FlowObjectDataProperty.newInstance(prop.developerName, prop.contentType,prop.value));
                }
            });
        }
        return result;
    }

    async doOutcome(outcomeName: string, node: TOCItem) {
        if(outcomeName === "OnSelect" && this.outcomes[outcomeName]?.pageActionBindingType !== ePageActionBindingType.NoSave && node ) 
        {
    
            await this.saveSelectedState(node);
            
            this.selectedNodeId = node.itemId;
        }

        if(outcomeName === "OnChange" && this.outcomes[outcomeName]?.pageActionBindingType !== ePageActionBindingType.NoSave && node ) 
        {
            if(this.changedNodes.indexOf(node.itemId)) {
                this.changedNodes.push(node.itemId)
            }
            await this.saveState();
            await this.saveChangedState();
        }

        
        if(this.outcomes[outcomeName]) {
            await this.triggerOutcome(outcomeName);
        }
        else {
            manywho.component.handleEvent(
                this,
                manywho.model.getComponent(
                    this.componentId,
                    this.flowKey,
                ),
                this.flowKey,
                null,
            );
        }

        this.expandToSelected();
        this.expandToFilter();
        this.TOCNodes.forEach((node: TOCNode) => {
            node.forceUpdate();
        })
        this.forceUpdate();
    }

    async saveSelectedState(node: TOCItem) {
        // if there's a clicked state attribute then set it
        if(this.getAttribute("SelectedState")) {
            let clickedState: FlowField;
            if(!this.fields[this.getAttribute("SelectedState")]) {
                try{
                    clickedState = await this.loadValue(this.getAttribute("SelectedState"));
                }
                catch(e) {
                    console.log("Loading " + this.getAttribute("SelectedState") + " failed.  Is the field referenced in the flow?")
                }
            } 
            else {
                clickedState = this.fields[this.getAttribute("SelectedState")]
            }
            if(clickedState) {
                clickedState.value = node.objectData;
                await this.updateValues(clickedState);
            }
            else {
                console.log("SelectedState [" + this.getAttribute("SelectedState") + "] doesn't exist")
            }
            
        }
    }
   
    async saveState() {
        let allItems = new FlowObjectDataArray();
        this.flatTree.forEach((item: TOCItem) => {
            let objData: FlowObjectData = item.objectData;
            objData.isSelected = true;
            allItems.addItem(objData);
        });
        await this.setStateValue(allItems);
    }

    async saveChangedState() {
        if(this.getAttribute("ModifiedState")) {
            let modifiedState: FlowField;
            if(! this.fields[this.getAttribute("ModifiedState")]) {
                try{
                    modifiedState = await this.loadValue(this.getAttribute("ModifiedState"));
                }
                catch(e) {
                    console.log("Loading " + this.getAttribute("ModifiedState") + " failed.  Is the field referenced in the flow?")
                }
            }
            else {
                modifiedState = this.fields[this.getAttribute("ModifiedState")];
            }
            if(modifiedState) {
                let changedItems = new FlowObjectDataArray();
                this.changedNodes.forEach((itemId: number) => {
                    let item: FlowObjectData = this.flatTree.get(itemId).objectData;
                    item.isSelected = true;
                    changedItems.addItem(item);
                });
                modifiedState.value=changedItems;
                await this.updateValues(modifiedState);
            }
            else {
                console.log("ModifiedState [" + this.getAttribute("ModifiedState") + "] doesn't exist");
            }
        }
    }

    async expand() {
        console.log("expand");
        this.TOCNodes.forEach((node: TOCNode) => {
            node.expanded=true;
            node.forceUpdate();
        });
    }

    async collapse() {
        console.log("collapse");
        this.TOCNodes.forEach((node: TOCNode) => {
            node.expanded=false;
            node.forceUpdate();
        });
    }

    //adds the parent path for the selected node
    expandToSelected(){
        this.expansionPath = [];
        if(this.selectedNodeId){
            //get the lowest item from nodeTree
            let nodeItem: TOCItem = this.flatTree.get(this.selectedNodeId);
            let topParent: number = nodeItem.itemId;
            while(nodeItem){
                nodeItem = this.flatTree.get(nodeItem.parentId);
                if(nodeItem){
                    this.expansionPath = this.expansionPath.concat(nodeItem.itemId);
                    this.expansionPath = this.expansionPath.filter((item, pos) => this.expansionPath.indexOf(item) === pos);
                }
            }
        }
    }

    expandToFilter(){
        this.filterExpansionPath = [];
        
        this.matchingNodes?.forEach((nodeId: number) => {
            let nodeItem: TOCItem = this.flatTree.get(nodeId);
            let topParent: number = nodeItem.itemId;
            while(nodeItem){
                nodeItem = this.flatTree.get(nodeItem.parentId);
                if(nodeItem){
                    this.filterExpansionPath = this.filterExpansionPath.concat(nodeItem.itemId);
                    this.filterExpansionPath = this.filterExpansionPath.filter((item, pos) => this.filterExpansionPath.indexOf(item) === pos);
                }
            }
        });
    }

    onDrag(e: any, nodeId: number) {
        console.log("drag " + nodeId);
        e.stopPropagation();
        const srcNode = e.currentTarget.getAttribute("data-node");
        if(srcNode) {
            e.dataTransfer.effectAllowed = "all";
            e.dataTransfer.setData('node', nodeId);
            this.draggedNode = nodeId;
        }
        else {
            e.dataTransfer.effectAllowed = "none";
            this.draggedNode = undefined;
        }
    }

    isPermissableTargetQueue(movingNode: number, potentialParentNode: number) : boolean {
        if(movingNode === potentialParentNode) {
            return false;
        }
        if(this.isChildOf(potentialParentNode,movingNode)) {
            return false;
        }
        if(this.isParentOf(potentialParentNode,movingNode)) {
            return false;
        }
        return true;
    }

    isChildOf( potentialParentNode: number, movingNode: number) : boolean {
        return this.TOCNodes.get(movingNode).props.parentId === potentialParentNode;
    }

    isParentOf( potentialParentNode: number, movingNode: number ) : boolean {
        return this.TOCNodes.get(potentialParentNode).props.parentId === movingNode;
    }

    onDragEnter(e: any) {
        e.preventDefault();
        e.stopPropagation();
    }

    onDragLeave(e: any) {
        e.preventDefault();
        e.stopPropagation();
        const queue = e.currentTarget.getAttribute("data-node");
        e.currentTarget.classList.remove("can-drop");
        e.currentTarget.classList.remove("cannot-drop");
    }

    onDragOver(e: any) {
        e.preventDefault();
        e.stopPropagation();
        const potentialParent: number  = parseInt(e.currentTarget.getAttribute("data-node"));
        const permissableTarget: boolean = this.isPermissableTargetQueue(this.draggedNode,potentialParent);
        if(!permissableTarget) {
            e.dataTransfer.dropEffect="none"; 
            e.currentTarget.classList.add("cannot-drop");
        }
        else {
            e.dataTransfer.dropEffect="move";
            e.currentTarget.classList.add("can-drop");
        }
    }

    async onDrop(e: any) {
        const srcNode: number = parseInt(e.dataTransfer.getData('node'));
        const tgtNode: number = parseInt(e.currentTarget.getAttribute("data-node"));
        const tgtPosition: string = e.currentTarget.getAttribute("data-node-pos");
    
        e.preventDefault();
        e.stopPropagation();
        
        this.draggedNode = undefined;
        e.dataTransfer.clearData();
        e.currentTarget.classList.remove("can-drop");
        e.currentTarget.classList.remove("cannot-drop");

        //could be moving or re-ordering
        // 
        if(srcNode &&  srcNode !== tgtNode) {
            await this.moveNode(srcNode, tgtNode,tgtPosition);
            this.forceUpdate();
        }
        
    }

    async moveNode(srcNode: number, targetNode: number, position: string) {

        const src: TOCItem = this.flatTree.get(srcNode);
        const tgt: TOCItem = this.flatTree.get(targetNode);
        const tgtParent: TOCItem = this.flatTree.get(tgt.parentId);

        switch(position) {
            case "before":
                src.itemSequence = tgt.itemSequence - 0.5;
                src.setParent(tgt.parentId || 0);
                console.log("move " + src.itemName + " " + position + " " + tgt.itemName + " in parent " + tgtParent?.itemName);
                break;
            case "after":
                src.itemSequence = tgt.itemSequence + 0.5;
                src.setParent(tgt.parentId || 0);
                console.log("move " + src.itemName + " " + position + " " + tgt.itemName + " in parent " + tgtParent?.itemName);
                break;
            case "on":
                src.itemSequence = 0.5;
                src.setParent(tgt.itemId);
                console.log("move " + src.itemName + " " + position + " " + tgt.itemName + " in parent " + tgtParent?.itemName);
                break

        }

        
        this.reSequenceNodes(src.parentId);
        this.nodeElementTree = this.buildNodes(0);
        this.doOutcome("OnChange",src);
        //this.forceUpdate();
    }

    
   

    buildHeaderButtons() : Array<any> {
        let content : any = [];

        let lastOrder: number = 0;
        let addedExpand: boolean = false;
        let addedContract: boolean = false;
        Object.keys(this.outcomes).forEach((key: string) => {
            const outcome: FlowOutcome = this.outcomes[key];
            if(outcome.order > 10 && addedExpand===false){
                content.push(
                    <span 
                        key="EXPAND"
                        className={"glyphicon glyphicon-plus toc-header-button-icon"} 
                        title={"Expand All"}
                        onClick={this.expand}
                    />
                );
                addedExpand=true;
            }
            if(outcome.order > 20 && addedContract===false){
                content.push(
                    <span 
                        key="CONTRACT"
                        className={"glyphicon glyphicon-minus toc-header-button-icon"} 
                        title={"Collapse All"}
                        onClick={this.collapse}
                    />
                );
                addedContract=true;
            }
            
            if (outcome.isBulkAction && outcome.developerName !== "OnSelect" && !outcome.developerName.toLowerCase().startsWith("cm")) {
                
                let icon: any;
                let label: any;
                if(outcome.attributes["display"]) {
                    if(outcome.attributes["display"].value.indexOf("icon") >=0 ) {
                        icon=(
                            <span 
                                className={"glyphicon glyphicon-" + (outcome.attributes["icon"]?.value || "plus") + " toc-header-button-icon"} 
                            />
                        );
                    }
                    if(outcome.attributes["display"].value.indexOf("text") >=0 ) {
                        label=(
                            <span 
                                className={"toc-header-button-label"} 
                            >
                                {outcome.label || key}
                            </span>
                        );
                    }
                }
                content.push(
                    <div 
                        key={key}
                        className={"toc-header-button"} 
                        title={outcome.label || key}
                        onClick={(e: any) => {this.doOutcome(key, undefined)}}
                    >
                        {icon}
                        {label}
                    </div>
                );
            }

        });
        if(addedExpand===false){
            content.push(
                <span 
                    key="EXPAND"
                    className={"glyphicon glyphicon-plus toc-header-button-icon"} 
                    title={"Expand Next Level"}
                    onClick={this.expand}
                />
            );
            addedExpand=true;
        }
        if(addedContract===false){
            content.push(
                <span 
                    key="CONTRACT"
                    className={"glyphicon glyphicon-minus toc-header-button-icon"} 
                    title={"Collapse All"}
                    onClick={this.collapse}
                />
            );
            addedContract=true;
        }
        return content;
    }

    flatTreeFind(itemId: number) : TOCItem | undefined {
        if(this.flatTree.has(itemId)) {
            return this.flatTree.get(itemId);
        }
        else {
            for(let key of Array.from( this.flatTree.keys())) {
                let parent: TOCItem = this.flatTreeFindChildren(this.flatTree.get(key).children, itemId);
                if(parent) {
                    return parent;
                }
            }
            return undefined;
        }
    }

    flatTreeFindChildren(children: Map<number, TOCItem>, itemId:  number) : TOCItem | undefined {
        if(children.has(itemId)) {
            return children.get(itemId);
        }
        else {
            for(let key of Array.from( children.keys())) {
                let parent: TOCItem = this.flatTreeFindChildren(children.get(key).children, itemId);
                if(parent) {
                    return parent;
                }
            }
            return undefined;
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////////
    // constructs the nodeTree and a flat a map of TOCItems from the model datasource data
    ///////////////////////////////////////////////////////////////////////////////////////////
    buildFlatTreeFromModel(){
        
        this.flatTree = new Map();

        

        this.model.dataSource.items.forEach((item: FlowObjectData) => {
            //construct TOCItem
            let node = TOCItem.fromObjectData(item, this);
            //add to flat tree for easy searching
            this.flatTree.set(node.itemId,node);
        });

        this.flatTree = new Map(Array.from(this.flatTree).sort((a: any,b: any) => {
            switch(true) {
                case a[1].itemName > b[1].itemName:
                    return 1;
                case a[1].itemName === b[1].itemName:
                    return 0;
                default: 
                    return -1;

            }
        }));

        this.nodeElementTree = this.buildNodes(0);
        this.forceUpdate();

    }

    reSequenceNodes(parentId: number) : Array<any> {
        let nodes: Array<any> = [];
        const elements: Array<any> = [];
        
        this.flatTree.forEach((item: TOCItem) => {
            if(item.parentId === parentId) {
                nodes.push(item);
            }
        });

        //"itemSequence",false
        nodes=nodes.sort((a: TOCItem,b: TOCItem) => {
            switch(true) {
                case a.itemSequence > b.itemSequence:
                    return 1;
                case a.itemSequence === b.itemSequence:
                    return 0;
                default: 
                    return -1;
            }
        });

        let pos: number = 1;
        nodes.forEach((item: TOCItem) => {
            item.setSequence(pos);
            pos++;
        });

        return nodes;
    }

    buildNodes(parentId: number) : any[]{
        let start: number = new Date().getTime();
        //this.expandToSelected();
        //this.expandToFilter();
        let nodes: Array<any> = this.reSequenceNodes(parentId);
        const elements: Array<any> = [];
        
        let isFirst: boolean = true;
        nodes.forEach((item: TOCItem) => {
            elements.push(
                <TOCNode 
                    key={item.itemId}
                    root={this}
                    isFirst={isFirst}
                    itemId={item.itemId}
                    expanded={this.defaultExpanded}
                    allowRearrange={!this.model.readOnly}
                    ref={(element: TOCNode) => {this.setNode(item.itemId ,element)}}
                    
                />
            );
            isFirst=false;
        });
        
        return elements;
    }
    

    showAll(e: any) {
        this.messageBox.hideMessageBox();
        this.filterTree(true);
    }

    noResults() {
        this.drawResults();
    }

    maxExceeded() {
        let tot: number = this.matchingNodes.length;
        this.matchingNodes = this.matchingNodes.slice(0,this.maxResults);
        this.messageBox.showMessageBox("High Result Count Warning",
            (<div>
                <span>{"Your search returned a large number of matches and could impact performance"}</span>
                <br></br>
                <br></br>
                <span>{"By default only the first " + this.maxResults + " of a possible " + tot + " will be displayed"}</span>
                <br></br>
                <br></br>
                <span>{"Do you want to see all the results ?"}</span>
                <br></br>
                <span>{"(This may take some time)"}</span>
            </div>),
            [new modalDialogButton("Show All",this.showAll),new modalDialogButton("Show Default",this.drawResults)]
        );
    }

    absoluteMaxExceeded() {
        let tot: number = this.matchingNodes.length;
        this.matchingNodes = this.matchingNodes.slice(0,this.absoluteMaxResults);
        this.messageBox.showMessageBox("Extreme High Result Count Warning",
            (<div>
                <span>{"Your search returned more than " + this.absoluteMaxResults + " matches and will impact performance"}</span>
                <br></br>
                <br></br>
                <span>{"The results have been truncated"}</span>
                <br></br>
                <br></br>
            </div>),
            [new modalDialogButton("Ok",this.drawResults)]
        );
    }

    filterTree(showAll : boolean = false) {
        
        let criteria: string = this.searchBox?.value;
        if(criteria?.length > 0) {
            if(criteria.length < 3) {
                let content: any = (
                    <span>Searching with less than 3 characters is not permitted.</span>
                );
                this.matchingNodes = undefined;
                this.messageBox.showMessageBox("Search Criteria Restriction",content,[new modalDialogButton("Ok",this.messageBox.hideMessageBox)]);
            }
            else {
                this.matchingNodes = [];
                //traverse all nodes
                this.flatTree.forEach((node: TOCItem) => {
                    if (
                        (node.itemName?.toLowerCase().indexOf(criteria.toLowerCase()) >= 0 || 
                        node.itemDescription?.toLowerCase().indexOf(criteria.toLowerCase()) >= 0)
                    ) {
                        this.matchingNodes.push(node.itemId)
                        //this.matchingNodes = this.matchingNodes.concat(node.itemId);
                        //this.matchingNodes = this.matchingNodes.filter((item, pos) => this.matchingNodes.indexOf(item) === pos);
                    }
                });
                
                switch(true) {

                    // over abs max.  truncate and warn
                    case this.matchingNodes.length >= this.absoluteMaxResults:
                        this.absoluteMaxExceeded();
                        break;

                    case this.matchingNodes.length >= this.maxResults && showAll === true:
                        this.drawResults();
                        break;

                    case this.matchingNodes.length >= this.maxResults && showAll === false:
                        this.maxExceeded();
                        break;

                    case this.matchingNodes.length === 0:
                        this.messageBox.showMessageBox("No Results",
                            (<span>{"The search returned no matches, please refine your search and try again."}</span>),
                            [new modalDialogButton("Ok",this.messageBox.hideMessageBox)]
                        );
                        this.searchBox.value = "";
                        break;
                    default:
                        this.drawResults();
                        break;
                }
            }
        }
        else {
            this.matchingNodes = undefined;
            this.drawResults();
        }
    }

    drawResults() {
        this.messageBox.hideMessageBox();
        this.nodeElementTree = this.buildNodes(0);
        this.expandToSelected();
        this.expandToFilter();
        this.TOCNodes.forEach((node: TOCNode) => {
            node.forceUpdate();
        });
        this.forceUpdate();
    }

    filterTreeClear() {
        this.searchBox.value = "";
        this.filterTree();
    }

    showContextMenu(e: any) {
        e.preventDefault();
        e.stopPropagation();
        let listItems: Map<string , any> = new Map();
        if(this.contextMenu) {
            Object.keys(this.outcomes).forEach((key: string) => {
                const outcome: FlowOutcome = this.outcomes[key];
                if (outcome.isBulkAction === true && outcome.developerName !== "OnSelect" && outcome.developerName.toLowerCase().startsWith("cm")) {
                    listItems.set(outcome.developerName,(
                        <li 
                            className="cm-item"
                            title={outcome.label || key}
                            onClick={(e: any) => {e.stopPropagation(); this.doOutcome(key, undefined)}}
                        >
                            <span
                                className={"glyphicon glyphicon-" + (outcome.attributes["icon"]?.value || "plus") + " cm-item-icon"} />
                            <span
                                className={"cm-item-label"}
                            >
                                {outcome.label || key}
                            </span>
                        </li>
                    ));
                }
            });
            this.contextMenu.showContextMenu(e.clientX, e.clientY,listItems);   
            this.forceUpdate();
        }
    }

    async hideContextMenu() {
        this.contextMenu.hideContextMenu();
    }

    addTopic(parentId: number) {
        console.log("add topic");
        this.buildNodes(0);
    }

    deleteTopic(parentId: number) {
        console.log("delete topic");
        this.buildNodes(0);
    }
    

    render() {
        
        if(this.loadingState !== eLoadingState.ready) {
            return this.lastContent;
        }
        
        
        //construct tree REACT elements
        this.debug("render",eDebugLevel.error);
        
        

        //handle classes attribute and hidden and size
        let classes: string = "toc " + this.getAttribute("classes","");
        let style: CSSProperties = {};
        if(this.model.visible === false) {
            style.display = "none";
        }
        if(this.model.width) {
            style.width=this.model.width + "px"
        }
        if(this.model.height) {
            style.height=this.model.height + "px"
        }
        
        let headerButtons: Array<any> = this.buildHeaderButtons();
      
        let title:  string = this.model.label || "";

        let searchBox: any;
        if(this.model.searchable) {
            searchBox=(
                <div
                        className="toc-header-search"
                    >
                        <input
                            className="toc-header-search-input"
                            ref={(element: HTMLInputElement) => {this.setSearchBox(element)}}
                        >
                        </input>
                        <span 
                            className={"glyphicon glyphicon-search toc-header-search-button"}
                            onClick={(e: any) => {this.filterTree(false)}}
                        />
                        <span 
                            className={"glyphicon glyphicon-remove toc-header-search-button"}
                            onClick={this.filterTreeClear}
                        />

                    </div>
            );
        }
        
        this.lastContent = (
            <div
                className={classes}
                style={style}
                onContextMenu={this.showContextMenu}
            >
                <FlowContextMenu
                    parent={this}
                    ref={(element: FlowContextMenu) => {this.contextMenu = element}}
                />
                <FlowMessageBox
                    parent={this}
                    ref={(element: FlowMessageBox) => {this.messageBox = element}}
                />
                <div
                    className="toc-header"
                >
                    <div
                        className="toc-header-title-wrapper"
                    >
                        <span
                            className="toc-header-title"
                            onClick={this.dbg}
                        >
                            {title}
                        </span>
                    </div>
                    {searchBox}
                    <div
                        className="toc-header-buttons"
                    >
                        {headerButtons}
                    </div>
                </div>
                <div 
                    className="toc-scroller" 
                >
                    <div
                        className="toc-body"
                    >
                        {this.nodeElementTree}
                    </div>
                </div>
            </div>
        );
        return this.lastContent;
    }

    dbg() {
        let state: any = this.getStateValue();
    }

}

manywho.component.register('TOC', TOC);