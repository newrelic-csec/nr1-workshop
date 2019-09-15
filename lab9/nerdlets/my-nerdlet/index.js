import React from 'react';
import PropTypes from 'prop-types';
import { LineChart, TableChart, Grid, GridItem, Spinner, HeadingText, Button, Icon, EntityByGuidQuery } from 'nr1';
import { distanceOfTimeInWords } from './utils';
import AddEntityModal from './add-entity-modal';

export default class MyNerdlet extends React.Component {
    static propTypes = {
        width: PropTypes.number,
        height: PropTypes.number.isRequired,
        launcherUrlState: PropTypes.object.isRequired,
        nerdletUrlState: PropTypes.object.isRequired
    }

    constructor(props) {
        super(props);
        //console for learning purposes
        console.debug(props); //eslint-disable-line
        //initiate the state
        this.state = {
            entity: null,
            entities: [],
            openModal: false
        }
        this.onSearchSelect = this.onSearchSelect.bind(this);
    }

    componentDidMount() {
        if (this.props.nerdletUrlState && this.props.nerdletUrlState.entityGuid) {
            console.debug("Calling loadState with props");
            this._loadState(this.props.nerdletUrlState.entityGuid);
        } else {
            this.setState({ openModal: true });
        }
    }

    componentWillUpdate(nextProps) {
        if (this.props && nextProps.nerdletUrlState && nextProps.nerdletUrlState.entityGuid && nextProps.nerdletUrlState.entityGuid != this.props.nerdletUrlState.entityGuid) {
            console.debug("Calling loadState with nextProps");
            this._loadState(nextProps.nerdletUrlState.entityGuid);
        }
        return true;
    }

    /**
     * Load the entity using the loadEntity utils function, then look up if there's a entityList-v0 collection for this entity and user.
     * @param {string} entityGuid
     */
    async _loadState(entityGuid) {
        const entity = await EntityByGuidQuery.query({ entityGuid }).then(results => {
            console.debug(results);
            return results.data.entities[0];
        }).catch(error => {
            console.error(error); //eslint-disable-line
        });
        this.setState({ entity, entities: [entity] });
    }

    /**
     * Receive an entity from the EntitySearch
     * @param {Object} entity
     */
    onSearchSelect(inEntity) {
        let { entities, entity } = this.state;
        entities.push(inEntity);
        this.setState({ entity, entities });
    }

    _buildNrql(base) {
        const { entities } = this.state;
        const appNames = entities ? entities.map((entity, i) => `'${entity.name}'`) : null;
        let nrql = `${base} FACET appName ${appNames ? `WHERE appName in (${appNames.join(",")}) ` : ''}`;
        return nrql;
    }

    render() {
        const { height, launcherUrlState, nerdletUrlState } = this.props;
        if (!nerdletUrlState || !nerdletUrlState.entityGuid) {
            return <HeadingText>Go find a Service or Browser App to compare</HeadingText>
        }
        const { entities, entity, openModal } = this.state;
        if (!entity) {
            return <Spinner/>
        }
        const { accountId } = entity;
        const eventType = entity ? entity.domain == 'BROWSER' ? 'PageView' : 'Transaction' : null;
        const { timeRange : { duration }} = launcherUrlState;
        const durationInMinutes = duration / 1000 / 60;
        const label = entity.domain == 'BROWSER' ? 'Browser Apps' : 'APM Services';
        return (<React.Fragment><Grid>
            {entities && entities.length > 0 ? <React.Fragment><GridItem columnStart={1} columnEnd={12} style={{padding: '10px'}}>
            <HeadingText>Performance over Time<Button sizeType={Button.SIZE_TYPE.SMALL} style={{marginLeft: '25px'}} onClick={() => { this.setState({ openModal: true }) }}><Icon type={Icon.TYPE.INTERFACE__SIGN__PLUS} /> {label}</Button></HeadingText>
            <p style={{marginBottom: '10px'}}>{distanceOfTimeInWords(duration)}</p>
            <LineChart
                accountId={accountId}
                query={this._buildNrql(`SELECT average(duration) from ${eventType} TIMESERIES SINCE ${durationInMinutes} MINUTES AGO `)}
                style={{height: `${height*.5}px`}}
            />
            </GridItem>
            <GridItem columnStart={1} columnEnd={12}>
                <TableChart
                    accountId={accountId}
                    query={this._buildNrql(`SELECT count(*) as 'requests', percentile(duration, 99, 90, 50) FROM ${eventType} SINCE ${durationInMinutes} MINUTES AGO`)}
                    style={{height: `${height*.5}px`}}
                />
            </GridItem>
            </React.Fragment> : <Spinner/>}
            </Grid>
            {openModal && <AddEntityModal
                {...this.state}
                entities={entities}
                onClose={() => {
                    this.setState({ openModal: false });
                }}
                onSearchSelect={this.onSearchSelect}
            />}
            </React.Fragment>);
    }
}