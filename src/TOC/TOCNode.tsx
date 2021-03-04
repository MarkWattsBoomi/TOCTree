import { FlowDialogBox, FlowMessageBox, FlowOutcome,  modalDialogButton } from 'flow-component-model';
import FlowContextMenu from 'flow-component-model/lib/Dialogs/FlowContextMenu';
import React, { CSSProperties } from 'react';
import ItemInfo from '../Dialogs/ItemInfo';
import TOC, { eDebugLevel } from './TOC';
import TOCItem from './TOCItem';

export default class TOCNode extends React.Component<any, any> {
    context: any;
    canvas: any;
    contextMenu: FlowContextMenu;
    messageBox: FlowMessageBox;

    expanded: boolean = false;
    
    constructor(props: any) {
        super(props);
        this.showContextMenu = this.showContextMenu.bind(this);
        this.hideContextMenu = this.hideContextMenu.bind(this);   
        this.showInfo = this.showInfo.bind(this);
        this.onSelect = this.onSelect.bind(this);
        this.expanded = this.props.expanded || false;
    }

    componentDidUpdate() {
        
    }

    componentDidMount() {
        const root: TOC = this.props.root;
        if(root.expansionPath.indexOf(this.props.nodeId) >= 0)
        {
            this.expanded = true;
            this.forceUpdate();
        }
    }
    
    
    showContextMenu(e: any) {
        e.preventDefault();
        e.stopPropagation();
        const root: TOC = this.props.root;
        const node: TOCItem = root.flatTree.get(this.props.itemId); 

        let listItems: Map<string , any> = new Map();
        if(this.contextMenu) {
            listItems.set("add",(
                <li 
                    className="cm-item"
                    title={"Add Sub Topic"}
                    onClick={(e: any) => {e.stopPropagation(); root.addTopic(node.itemId)}}
                >
                    <span
                        className={"glyphicon glyphicon-plus cm-item-icon"} />
                    <span
                        className={"cm-item-label"}
                    >
                        {"Add topic"}
                    </span>
                </li>
            ));
            listItems.set("delete",(
                <li 
                    className="cm-item"
                    title={"Delete Topic"}
                    onClick={(e: any) => {e.stopPropagation(); root.deleteTopic(node.itemId)}}
                >
                    <span
                        className={"glyphicon glyphicon-trash cm-item-icon"} />
                    <span
                        className={"cm-item-label"}
                    >
                        {"Delete topic"}
                    </span>
                </li>
            ));
            if(root.model.readOnly === false) {
                this.contextMenu.showContextMenu(e.clientX, e.clientY,listItems);   
                this.forceUpdate();
            }
        }
    }

    async hideContextMenu() {
        this.contextMenu.hideContextMenu();
    }

    showInfo() {
        const root: TOC = this.props.root;
        const node: TOCItem = root.flatTree.get(this.props.nodeId); 
        let content: any = (
            <ItemInfo
                item={node}
                display={root.model.displayColumns}
            />
        );
        this.messageBox.showMessageBox(node.itemName,content,[new modalDialogButton("Close",this.messageBox.hideMessageBox)])
    }

    onSelect(e: any) {
        const root: TOC = this.props.root;
        const node: TOCItem = root.flatTree.get(this.props.itemId); 
        //console.log("onselect " + node.itemName);
        root.doOutcome("OnSelect",node);
    }

    render() {
        let expander: any;
        let icon: any;

        let buttons: Array<any> = [];
        let content: Array<any> = [];
        const root: TOC = this.props.root;
        const node: TOCItem = root.flatTree.get(this.props.itemId); 
        const children: any[] = root.buildNodes(node.itemId);
        //const parentItem: tocItem = root.findTreeNode(root.nodeTree,this.props.parentId); 
        //const parent = root.getNode(this.props.parentId);
        //set the queue icon
        icon=node.itemIcon || root.getAttribute("DefaultIcon","record");
        
        if((children && children.length > 0) || this.props.expanded===true)
        {
            let expanderIcon: string="plus";
            if(this.expanded === true || root.expansionPath.indexOf(this.props.nodeId) >= 0 || root.filterExpansionPath.indexOf(this.props.nodeId) >= 0)
            {
                expanderIcon="minus";
                content=children;
            }
            expander = (
                <span 
                    className={"glyphicon glyphicon-" + expanderIcon + " toc-node-expander-icon"}
                    onClick={(e: any) => {this.toggleExpand(e)}}    
                />
            );
            
        }

        let selectedClass: string = "";
        if(node.itemId === (root.selectedNodeId ? root.selectedNodeId : undefined)) {
            selectedClass = " toc-node-item-selected";
        }

        let lowestLevel: boolean = children.length===0;

        
        Object.keys(root.outcomes).forEach((key: string) => {
            const outcome: FlowOutcome = root.outcomes[key];
            if (outcome.isBulkAction === false && outcome.developerName !== "OnSelect" && !outcome.developerName.toLowerCase().startsWith("cm")) {
                let showOutcome: boolean = true;
                if(outcome.attributes["LowestOnly"]?.value.toLowerCase() === "true" && !lowestLevel){
                    showOutcome=false;
                }
                if(showOutcome){
                    buttons.push(
                        <span 
                            key={key}
                            className={"glyphicon glyphicon-" + (outcome.attributes["icon"]?.value || "plus") + " toc-node-button"} 
                            title={outcome.label || key}
                            onClick={(e: any) => {e.stopPropagation(); root.doOutcome(key, node)}}
                        />
                    );
                }
            }
        });
          
        let path: string = "";
        if(root.getAttribute("AutoNumber","false") === "true") {
            let pNode: TOCItem = root.flatTree.get(node.parentId)
            while(pNode){
                if(path.length > 0) {
                    path = "." + path;
                }
                path = pNode.itemSequence + path;
                pNode = root.flatTree.get(pNode.parentId);
            }
            if(path.length > 0) {
                path += ".";
            }
            path += node.itemSequence;
        }

        let count: string = "";
        if(node.count !== undefined) {
            count = " (" + node.count + ")";
        }
        let label: string = path +  " " + node.itemName + count;
        if(root.debugLevel >= eDebugLevel.info) {
            label += " (" + node.itemId + ") (" + node.parentId + ")"
        }

        let style: CSSProperties = {};
        style.paddingLeft="10px";

        //if there's a filter list then hide me if not in it or not in expand list
        if(root.matchingNodes) {
            if(root.matchingNodes.indexOf(node.itemId)>=0 || root.filterExpansionPath.indexOf(node.itemId)>=0 || root.expansionPath.indexOf(node.itemId)>=0 || root.selectedNodeId===node.itemId) {
                style.visibility="visible";
            }
            else {
                style.visibility="hidden";
                style.height="0px";
            }
        }

        let nodeIcon: any;
        if(root.getAttribute("ShowInfo","false").toLowerCase() === "true") {
            nodeIcon = (
                <span 
                    className={"glyphicon glyphicon-info-sign toc-node-button"}
                    onClick={(e: any) => {e.stopPropagation(); this.showInfo(); root.doOutcome("OnInfo", node)}}
                />
            );
        }
        else {
            nodeIcon = (
                <span 
                    className={"glyphicon glyphicon-" + icon + " toc-node-icon"}
                />
            );
        }

        let dropBefore: any;
        
        if(this.props.isFirst === true) {
            dropBefore = (
                <div 
                    className = "toc-node-before"
                    onDragStart={(e) => {root.onDrag(e,node.itemId); }}
                    onDragEnter={(e) => {root.onDragEnter(e); }}
                    onDragLeave={(e) => {root.onDragLeave(e); }}
                    onDragOver={(e) => {root.onDragOver(e); }}
                    onDrop={(e) => {root.onDrop(e); }}
                    data-node={node.itemId}
                    data-node-pos={"before"}
                />
            );
        }

        let dropAfter: any = (
            <div 
                className = "toc-node-after"
                onDragStart={(e) => {root.onDrag(e,node.itemId); }}
                onDragEnter={(e) => {root.onDragEnter(e); }}
                onDragLeave={(e) => {root.onDragLeave(e); }}
                onDragOver={(e) => {root.onDragOver(e); }}
                onDrop={(e) => {root.onDrop(e); }}
                data-node={node.itemId}
                data-node-pos={"after"}
            />
    );

    let onDrag: any;
    let draggable: boolean = false;
    if(root.model.readOnly === false) {
        onDrag=(e: any, itemId: number) => {root.onDrag(e,itemId)};
        draggable = true;
    }
        
        return( 
            <div
                className={"toc-node"}
            >
                {dropBefore}
                <div
                    className={"toc-node-content "}
                    style={style}
                    title={node.itemDescription}
                    onContextMenu={(e: any) => {e.preventDefault()}}
                >
                    <div 
                        className = "toc-node-title"
                    >
                        <div
                            className="toc-node-expander"
                        >
                            {expander}
                        </div>
                        <div
                            className={"toc-node-item" + selectedClass }
                            onClick={this.onSelect}
                            title={node.itemDescription}
                            draggable={draggable}
                            onDragStart={(e) => {onDrag(e,node.itemId)}} //root.onDrag(e,node.itemId); }}
                            onDragEnter={(e) => {root.onDragEnter(e); }}
                            onDragLeave={(e) => {root.onDragLeave(e); }}
                            onDragOver={(e) => {root.onDragOver(e); }}
                            onDrop={(e) => {root.onDrop(e); }}
                            data-node={node.itemId}
                            data-node-pos={"on"}
                            onContextMenu={this.showContextMenu}
                        >
                            <FlowMessageBox
                                parent={this}
                                ref={(element: FlowMessageBox) => {this.messageBox = element}}
                            />
                            <FlowContextMenu
                                parent={this}
                                ref={(element: FlowContextMenu) => {this.contextMenu = element}}
                            />
                            <div
                                className="toc-node-icons"
                            >
                                {nodeIcon}
                            </div>
                            <div
                                className = "toc-node-label"
                            >
                                {label}
                            </div>
                            <div
                                className="toc-node-icons"
                            >
                                {buttons}
                            </div>
                        </div>
                    </div>
                    <div 
                        className = "toc-node-body"
                    >
                        {content}
                    </div>
                </div>
                {dropAfter}
            </div>
        );
    }

    toggleExpand(e: any) {
        this.expanded = !this.expanded;
        this.forceUpdate();
    }
}
